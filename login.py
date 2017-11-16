#!/usr/bin/env python3

from flask import Flask, render_template, request, jsonify, redirect, session
from flask_login import LoginManager, UserMixin, login_user, login_required, current_user, logout_user
import json
import pymongo
from bson import ObjectId
import re
from passlib.hash import sha256_crypt
from bson.son import SON

# config
app = Flask(__name__)
app.config["SECRET_KEY"] = "once egyszer the ido there volt kette little kecske"
login_manager = LoginManager()
login_manager.init_app(app)

# mongodb
conn = pymongo.MongoClient()
db = conn["torpedo-proto"]
coll_users = db["users"]
coll_games = db["games"]

# class for Users
class User(UserMixin):
	def __init__(self, id, username, email, password):
		self.id = id # this must be unicode!!!
		self.username = username
		self.email = email
		self.password = password

@login_manager.user_loader
def load_user(id):
	tmp = coll_users.find_one({"_id": ObjectId(id)})
	return User(str(tmp["_id"]), tmp["username"], tmp["email"], tmp["password"])

@app.route("/login", methods=["GET", "POST"])
def login():
	if current_user.is_authenticated:
		return redirect("/secure")
	if request.method == "GET":
		return render_template("login.html")
	else:
		data = request.get_json()
		tmp = coll_users.find_one({"username": data["username"]})
		if tmp is None:
			return jsonify({"success": False})
		if sha256_crypt.verify(data["password"], tmp["password"]):
			user = User(str(tmp["_id"]), tmp["username"], tmp["email"], tmp["password"])
			login_user(user)
			return jsonify({"success": True})
		else:
			return jsonify({"success": False})

def registration_error(field, message):
	error = {
		"field": field,
		"message": message
	}
	return {"success": False, "error": error}

def registrate_user(data):
	# extract data from json
	username = data["username"]
	email = data["email"]
	password = data["password"]
	repassword = data["repassword"]

	# validate data
	if re.match(r"[a-zA-Z0-9]{4,10}", username) is None:
		return jsonify(registration_error("username", "Username's length must be 4-10 characters!"))
	if re.match(r".{6,}", password) is None:
		return jsonify(registration_error("password", "Password's length must be at least 6 characters!"))
	if not password==repassword:
		return jsonify(registration_error("password", "Passwords doesn't match!"))
	if coll_users.find_one({"username": username}) is not None:
		return jsonify(registration_error("username", "Username already in use!"))
	if re.match("^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$", email) is None:
		return jsonify(registration_error("email", "Invalid e-mail address!"))
	if coll_users.find_one({"email": email}) is not None:
		return jsonify(registration_error("email", "E-mail has already taken!"))

	# if data is valid, encrypt password and save user to db
	hash = sha256_crypt.encrypt(password)
	coll_users.insert_one({"username": username, "email": email, "password": hash, "wins": 0, "losses": 0})
	return jsonify({"success": True, "error": None})

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

@app.route("/secure")
@login_required
def secured():
	context = {
		"username": current_user.username
	}
	return render_template("secure.html", **context)

@app.route('/')
def hello_world():
	return render_template("main.html")

def getGamesList(username):
	return list(coll_games.find({"$or": [{"player1": username}, {"player2": username}]}).sort("date", pymongo.DESCENDING))

def getTopNPlayers(N):
	tmp_list = list(coll_users.find().sort("wins", pymongo.DESCENDING).limit(N))
	result = []
	for i in range(0, len(tmp_list)):
		result.append({"rank": i+1, "username": tmp_list[i]["username"], "wins": tmp_list[i]["wins"], "losses": tmp_list[i]["losses"]})
	return result

@app.route("/user/<username>")
@login_required
def user_page(username):
	user = coll_users.find_one({"username": username})
	if user is None:
		return redirect("/")
	else:
		context = {
			"username": user["username"],
			"win": user["wins"],
			"lose": user["losses"],
			"games": getGamesList(username)
		}
		return render_template("user.html", **context)

@app.route("/toplist")
@login_required
def toplist():
	context = {
		"toplist": getTopNPlayers(10)
	}
	return render_template("toplist.html", **context)

if __name__ == "__main__":
	app.run(debug=True, threaded=True, host="0.0.0.0")