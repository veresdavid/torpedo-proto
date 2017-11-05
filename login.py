#!/usr/bin/env python3

from flask import Flask, render_template, request, jsonify, redirect, session
from flask_login import LoginManager, UserMixin, login_user, login_required, current_user, logout_user
import json
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import pymongo
from bson import ObjectId
import re
from passlib.hash import sha256_crypt

# config
app = Flask(__name__)
# app.config["SECRET_KEY"] = "once egyszer the ido there volt kette little pig"
app.config["SECRET_KEY"] = "once egyszer the ido there volt kette little kecske"
app.config["AES_KEY"] = "kecske kacsa kod"
login_manager = LoginManager()
login_manager.init_app(app)

# mongodb
conn = pymongo.MongoClient()
db = conn["torpedo-proto"]
coll_users = db["users"]

# class for Users
class User(UserMixin):
	def __init__(self, id, username, password):
		self.id = id # this must be unicode!!!
		self.username = username
		self.password = password

def pad(s):
	return s + ((16-len(s) % 16) * "{")

@login_manager.user_loader
def load_user(id):
	tmp = coll_users.find_one({"_id": ObjectId(id)})
	return User(str(tmp["_id"]), tmp["username"], tmp["password"])
	# return User("1", "dave", "kecske", generate_secret("dave", "kecske"))

@app.route("/login", methods=["GET", "POST"])
def login():
	if current_user.is_authenticated:
		return redirect("/secure")
	if request.method == "GET":
		return render_template("login.html")
	else:
		data = request.get_json()
		# tmp = coll_users.find_one({"username": data["username"], "password": data["password"]})
		tmp = coll_users.find_one({"username": data["username"]})
		if tmp is None:
			return jsonify({"success": False})
		if sha256_crypt.verify(data["password"], tmp["password"]):
			# user = User("1", "dave", "kecske", generate_secret("dave", "kecske"))
			user = User(str(tmp["_id"]), tmp["username"], tmp["password"])
			login_user(user)
			return jsonify({"success": True})
		else:
			return jsonify({"success": False})

def registrate_user(data):
	# validate: data format, already exist
	# return json response
	username = data["username"]
	password = data["password"]
	if re.match(r"[a-zA-Z0-9]{4,10}", username) is None:
		return jsonify({"error": True, "reason": "Username's length must be 4-10 characters!"})
	if re.match(r".{6,}", password) is None:
		return jsonify({"error": True, "reason": "Password's length must be at least 6 characters!"})
	if coll_users.find_one({"username": username}) is not None:
		return jsonify({"error": True, "reason": "Username already in use!"})
	hash = sha256_crypt.encrypt(password)
	coll_users.insert_one({"username": username, "password": hash})
	return jsonify({"success": True})

@app.route("/registration", methods=["GET", "POST"])
def registration():
	if current_user.is_authenticated:
		return redirect("/")

	if request.method == "GET":
		return render_template("/registration.html")
	else:
		data = request.get_json()
		return registrate_user(data)

@app.route("/logout")
@login_required
def logout():
	logout_user()
	return redirect("/")

@app.route("/kek")
def random_api():
	if current_user.is_authenticated:
		return jsonify({"data": "TOP KEK"})
	else:
		return jsonify({"error": True})
	return "kek"

@app.route("/secure")
@login_required
def secured():
	context = {
		"username": current_user.username
	}
	return render_template("secure.html", **context)

@app.route('/')
def hello_world():
	return "Hello, World!"


if __name__ == "__main__":
	app.run(debug=True, threaded=True)