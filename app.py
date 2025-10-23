# app.py
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from pymongo import MongoClient, ASCENDING
from bson.objectid import ObjectId
from dotenv import load_dotenv
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# NEW imports
from itsdangerous import URLSafeTimedSerializer
from flask_mail import Mail, Message
import logging
import traceback

# Load .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "supersecretkey")  # Must exist for sessions

logging.getLogger("pymongo").setLevel(logging.WARNING)


# --- Logging setup ---
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# --- Mail config ---
app.config.update(
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_USE_TLS=bool(int(os.getenv("MAIL_USE_TLS", "1"))),
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_DEFAULT_SENDER=os.getenv("MAIL_DEFAULT_SENDER", "noreply@example.com")
)

mail = Mail(app)
ts = URLSafeTimedSerializer(app.secret_key)

# --- MongoDB connection ---
MONGODB_URI = os.getenv('MONGODB_URI', "mongodb://localhost:27017/visiting_card_app")
client = MongoClient(MONGODB_URI)
default_db = client.get_default_database()
db = default_db if default_db is not None else client['visiting_card_app']
cards_col = db.visiting_cards
users_col = db.users

# Ensure unique index on email & username
try:
    users_col.create_index([("email", ASCENDING)], unique=True)
    users_col.create_index([("username", ASCENDING)], unique=True)
except Exception as exc:
    logger.debug("Index creation skipped or failed: %s", exc)
# Upload folder
UPLOAD_FOLDER = os.path.join('static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# ------------------ Helpers for verification ------------------

def generate_confirmation_url(email):
    """Return the verification link for a given email."""
    token = ts.dumps(email, salt="email-confirm-salt")
    confirm_url = url_for('confirm_email', token=token, _external=True)
    return confirm_url

def send_verification_email(email):
    """Send verification email with token (24h expiry)."""
    token = ts.dumps(email, salt="email-confirm-salt")
    confirm_url = url_for('confirm_email', token=token, _external=True)
    html = render_template('email_verify.html', confirm_url=confirm_url)
    subject = "Please verify your email"

    msg = Message(subject=subject, recipients=[email], html=html)
    try:
        logger.info("Sending verification email to %s", email)
        mail.send(msg)
        logger.info("Verification email sent to %s", email)
    except Exception as exc:
        logger.error("Failed to send verification email to %s: %s", email, exc)
        logger.debug("Traceback:\n%s", traceback.format_exc())
        raise exc  # Let it fail — no dev fallback

# ------------------ Routes ------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create')
def create():
    return render_template('create.html')

@app.route('/cards')
def cards():
    if 'user_id' not in session:
        flash("Please login to view your cards", "danger")
        return redirect(url_for('login'))

    user_id = session['user_id']
    user_cards = list(cards_col.find({'user_id': user_id}).sort('created_at', -1))
    for card in user_cards:
        card['_id'] = str(card['_id'])
    return render_template('cards.html', cards=user_cards)

@app.route('/card/<card_id>')
def view_card(card_id):
    if 'user_id' not in session:
        flash("Please login to view your card.", "danger")
        return redirect(url_for('login'))

    card = cards_col.find_one({'_id': ObjectId(card_id), 'user_id': session['user_id']})
    if not card:
        flash("Card not found or you do not have permission to view it.", "danger")
        return redirect(url_for('cards'))

    card['_id'] = str(card['_id'])
    return render_template('view_card.html', card=card, card_id=card['_id'])

@app.route('/edit/<card_id>')
def edit_card(card_id):
    if 'user_id' not in session:
        flash("Please login to edit your card.", "danger")
        return redirect(url_for('login'))

    card = cards_col.find_one({'_id': ObjectId(card_id), 'user_id': session['user_id']})
    if not card:
        flash("Card not found or you cannot edit this card.", "danger")
        return redirect(url_for('cards'))

    card['_id'] = str(card['_id'])
    return render_template('edit.html', card=card)

# ------------------ API Endpoints ------------------

@app.route('/api/cards', methods=['GET'])
def get_cards():
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Not logged in'}), 401

        user_id = session['user_id']
        cards = list(cards_col.find({'user_id': user_id}).sort('created_at', -1))
        for card in cards:
            card['_id'] = str(card['_id'])
        return jsonify({'success': True, 'data': cards})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/cards/<card_id>', methods=['GET'])
def get_card(card_id):
    try:
        card = cards_col.find_one({'_id': ObjectId(card_id)})
        if card:
            cards_col.update_one({'_id': ObjectId(card_id)}, {'$inc': {'view_count': 1}})
            card['_id'] = str(card['_id'])
        return jsonify({'success': True, 'data': card})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/cards', methods=['POST'])
def create_card():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'User not logged in'}), 401

    try:
        full_name = request.form.get('full_name')
        job_title = request.form.get('job_title')
        company = request.form.get('company')
        bio = request.form.get('bio')
        email = request.form.get('email')
        phone = request.form.get('phone')
        website = request.form.get('website')
        address = request.form.get('address')
        instagram = request.form.get('instagram')
        facebook = request.form.get('facebook')
        template = request.form.get('template', 'template1')
        is_public = request.form.get('is_public') in ['true', 'on', '1']

        profile_image_url = ''
        if 'profile_image' in request.files:
            file = request.files['profile_image']
            if file.filename != '':
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                profile_image_url = url_for('static', filename=f'uploads/{filename}')

        card_data = {
            'full_name': full_name,
            'job_title': job_title,
            'company': company,
            'bio': bio,
            'email': email,
            'phone': phone,
            'website': website,
            'address': address,
            'instagram': instagram,
            'facebook': facebook,
            'template': template,
            'profile_image_url': profile_image_url,
            'is_public': is_public,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'view_count': 0,
            'user_id': session['user_id']
        }

        res = cards_col.insert_one(card_data)
        card_data['_id'] = str(res.inserted_id)
        return jsonify({'success': True, 'data': card_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/cards/<card_id>', methods=['PUT'])
def update_card(card_id):
    try:
        data = request.json
        data['updated_at'] = datetime.utcnow()
        res = cards_col.update_one(
            {'_id': ObjectId(card_id), 'user_id': session['user_id']},
            {'$set': data}
        )
        if res.matched_count == 0:
            return jsonify({'success': False, 'error': 'Card not found or not authorized'}), 403

        card = cards_col.find_one({'_id': ObjectId(card_id)})
        if card:
            card['_id'] = str(card['_id'])
        return jsonify({'success': True, 'data': card})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/cards/<card_id>', methods=['DELETE'])
def delete_card(card_id):
    try:
        cards_col.delete_one({'_id': ObjectId(card_id)})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ------------------ Auth (register/login) ------------------

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        if not username:
            flash("Please enter a username.", "danger")
            return redirect(url_for('register'))
        if not email or not password:
            flash("Email and password required.", "danger")
            return redirect(url_for('register'))
        if password != confirm_password:
            flash("Passwords do not match.", "danger")
            return redirect(url_for('register'))
        if users_col.find_one({'email': email}):
            flash("Email already exists!", "danger")
            return redirect(url_for('register'))
        if users_col.find_one({'username': username}):
            flash("Username already taken, choose another.", "danger")
            return redirect(url_for('register'))

        hashed_password = generate_password_hash(password)
        user_data = {
            'username': username,
            'email': email,
            'password': hashed_password,
            'is_active': False,
            'created_at': datetime.utcnow(),
            'last_verification_sent_at': datetime.utcnow()
        }

        try:
            users_col.insert_one(user_data)
        except Exception as e:
            logger.error("User insert failed: %s", e)
            flash("Registration failed. That email or username may already exist.", "danger")
            return redirect(url_for('register'))

        try:
            send_verification_email(email)
        except Exception as e:
            logger.error("Failed to send verification email: %s", e)
            flash("Account created but failed to send verification email. Check logs.", "danger")
            return redirect(url_for('login'))

        flash("Account created! A verification email has been sent — check inbox/spam.", "success")
        return redirect(url_for('login'))

    return render_template('register.html')

@app.route('/confirm/<token>')
def confirm_email(token):
    try:
        email = ts.loads(token, salt="email-confirm-salt", max_age=60*60*24)  # 24h
    except Exception:
        flash("The verification link is invalid or has expired.", "danger")
        return redirect(url_for('resend_verification'))

    user = users_col.find_one({'email': email})
    if not user:
        flash("User not found. Please register.", "danger")
        return redirect(url_for('register'))

    if user.get('is_active'):
        flash("Account already verified. Please login.", "info")
        return redirect(url_for('login'))

    users_col.update_one({'email': email}, {'$set': {'is_active': True}})
    flash("Email verified! You can now log in.", "success")
    return redirect(url_for('login'))

@app.route('/resend', methods=['GET', 'POST'])
def resend_verification():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        if not email:
            flash("Enter your email.", "danger")
            return redirect(url_for('resend_verification'))

        user = users_col.find_one({'email': email})
        if not user:
            flash("No account with that email.", "danger")
            return redirect(url_for('register'))

        if user.get('is_active'):
            flash("Account already verified. Please login.", "info")
            return redirect(url_for('login'))

        try:
            users_col.update_one({'email': email}, {'$set': {'last_verification_sent_at': datetime.utcnow()}})
            send_verification_email(email)
            flash("Verification email resent. Check your inbox and spam.", "success")
        except Exception as e:
            logger.error("Failed to resend verification email: %s", e)
            flash("Failed to resend verification email. Check logs.", "danger")
            return redirect(url_for('login'))

        return redirect(url_for('login'))

    return render_template('resend.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        user = users_col.find_one({'email': email})
        if user and check_password_hash(user.get('password', ''), password):
            if not user.get('is_active'):
                flash("Please verify your email before logging in. Use Resend if needed.", "warning")
                return redirect(url_for('resend_verification'))

            session['user_id'] = str(user['_id'])
            session['username'] = user.get('username') or email.split('@')[0]
            flash("Logged in successfully!", "success")
            return redirect(url_for('index'))
        else:
            flash("Invalid email or password", "danger")
            return redirect(url_for('login'))

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash("Logged out successfully!", "success")
    return redirect(url_for('index'))

# Dev-only route to test email
@app.route('/_send_test_email')
def _send_test_email():
    test_email = request.args.get('to') or os.getenv("MAIL_USERNAME")
    if not test_email:
        return "Set MAIL_USERNAME env var or pass ?to=you@example.com", 400
    try:
        send_verification_email(test_email)
        return f"✅ Sent test verification email to {test_email}. Check inbox/spam."
    except Exception as e:
        return f"❌ Failed to send test email: {str(e)}", 500

# ------------------ Run app ------------------
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
