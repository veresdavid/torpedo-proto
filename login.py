#!/usr/bin/env python3

from flask import Flask, render_template, request, jsonify, redirect, session
from flask_login import LoginManager, UserMixin, login_user, login_required, current_user, logout_user
import json
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import pymongo
from bson import ObjectId

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
	def __init__(self, id, username, password, secret):
		self.id = id # this must be unicode!!!
		self.username = username
		self.password = password
		self.secret = secret

def pad(s):
	return s + ((16-len(s) % 16) * "{")

def generate_secret(username, password):
	# TODO: make some encryption here!!!
	ciphertext = username + ";" + password
	return ciphertext

@login_manager.user_loader
def load_user(id):
	tmp = coll_users.find_one({"_id": ObjectId(id)})
	return User(str(tmp["_id"]), tmp["username"], tmp["password"], generate_secret(tmp["username"], tmp["password"]))
	# return User("1", "dave", "kecske", generate_secret("dave", "kecske"))

@app.route("/login", methods=["GET", "POST"])
def login():
	if request.method == "GET":
		return render_template("login.html")
	else:
		data = request.get_json()
		tmp = coll_users.find_one({"username": data["username"], "password": data["password"]})
		if tmp is not None:
			# user = User("1", "dave", "kecske", generate_secret("dave", "kecske"))
			user = User(str(tmp["_id"]), tmp["username"], tmp["password"], generate_secret(tmp["username"], tmp["password"]))
			login_user(user)
			return jsonify({"success": True})
		else:
			return jsonify({"success": False})

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