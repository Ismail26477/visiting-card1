#app.py

from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename


load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "supersecretkey")  # Must exist for sessions

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI')
client = MongoClient(MONGODB_URI)
db = client['visiting_card_app']
cards_col = db.visiting_cards
users_col = db.users

UPLOAD_FOLDER = os.path.join('static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

 

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

    # Only fetch cards for the logged-in user
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

    card['_id'] = str(card['_id'])  # convert ObjectId to string
    return render_template('view_card.html', card=card, card_id=card['_id'])  # Pass card_id


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
        # Only fetch cards for this user
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
        # Get form values
        full_name = request.form.get('full_name')
        job_title = request.form.get('job_title')
        company = request.form.get('company')
        bio = request.form.get('bio')
        email = request.form.get('email')
        phone = request.form.get('phone')
        website = request.form.get('website')
        address = request.form.get('address')
        linkedin = request.form.get('linkedin')
        twitter = request.form.get('twitter')
        instagram = request.form.get('instagram')
        facebook = request.form.get('facebook')
        github = request.form.get('github')
        template = request.form.get('template', 'template1')
        is_public = request.form.get('is_public') in ['true', 'on', '1']  # ✅ handle checkbox

        # Handle file upload
        profile_image_url = ''
        if 'profile_image' in request.files:
            file = request.files['profile_image']
            if file.filename != '':
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                profile_image_url = url_for('static', filename=f'uploads/{filename}')

        # Insert card into MongoDB
        card_data = {
            'full_name': full_name,
            'job_title': job_title,
            'company': company,
            'bio': bio,
            'email': email,
            'phone': phone,
            'website': website,
            'address': address,
            'linkedin': linkedin,
            'twitter': twitter,
            'instagram': instagram,
            'facebook': facebook,
            'github': github,
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

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('name', '').strip()  # fixed
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
            'created_at': datetime.utcnow()
        }
        users_col.insert_one(user_data)
        flash("Account created successfully! Please login.", "success")
        return redirect(url_for('login'))

    return render_template('register.html')



@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        user = users_col.find_one({'email': email})
        if user and check_password_hash(user.get('password', ''), password):
            session['user_id'] = str(user['_id'])

            # Use stored username if present; otherwise fall back to email local-part
            username = user.get('username')
            if not username or username.strip() == '':
                # try to derive from email
                username = email.split('@')[0] if email else 'User'
            session['username'] = username

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


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
