import datetime

import BTrees
import transaction
from flask import Flask, render_template, request, session
#from flask_session import Session
import json
import pandas as pd
from BiCluster import *
from CustomCluster import *
import ZODB, ZODB.FileStorage
import dataset
import uuid
import os
import base64
from Crypto.Cipher import AES
from Crypto.Hash import SHA256
from Crypto import Random
from io import StringIO
from datetime import timedelta
import sessionData

import hashlib, binascii, os

app = Flask(__name__)
app.debug = True

app.secret_key = uuid.uuid4().hex

#app.config['SESSION_TYPE'] = 'filesystem'
#Session(app)

cacheObject = {}

curPath = os.path.dirname(__file__)

connection = ZODB.connection(os.path.join(curPath, 'database/db.fs'))
dbRoot = connection.root

sessionCacheTimeout = 30

if not hasattr(dbRoot, 'dataSets'):
	dbRoot.dataSets = BTrees.OOBTree.BTree()


#@app.before_request
#def make_session_permanent():
#	session.permanent = True
#	app.permanent_session_lifetime = timedelta(minutes=sessionCacheTimeout)
#	app.permanent_session_lifetime = timedelta(minutes=sessionCacheTimeout)


@app.route("/", methods=['GET', 'POST'])
def output():
	return render_template('dataupload.html')


def checkDataCache(dataId):
	if (dataId in cacheObject):
		return

	print("reload data into cache")
	return getData(dataId)


#@app.route("/isEncrypted/<string:dataId>", methods=['GET'])
#def isEncrypted(dataId):
	#if dbRoot.dataSets.has_key(dataId):
#		return  json.dumps(hasattr(dbRoot.dataSets[dataId], "encrypt") and dbRoot.dataSets[dataId].encrypt)
	#else:
#		return  json.dumps(False)


@app.route("/authorize/<string:dataId>", methods=['POST'])
def authorize(dataId):
	global cacheObject

	if dbRoot.dataSets.has_key(dataId):
		receivedData = request.get_json()

		pwd = receivedData["pwd"]

		sd = getSessionData(dataId)

		if hasattr(dbRoot.dataSets[dataId], "encrypt") and dbRoot.dataSets[dataId].encrypt:
			authorized = verify_password(dbRoot.dataSets[dataId].hashedPwd, pwd)

			if (authorized and dataId not in cacheObject):
				cacheObject[dataId] = {}
				with open(dbRoot.dataSets[dataId].file, 'rb') as file:
					cacheObject[dataId]["dataset"] = file.read()

				cacheObject[dataId]["encrypt"] = True
				cacheObject[dataId]["dataset"] = getDecryptedDataset(cacheObject[dataId], pwd)

				customClustering = hasattr(dbRoot.dataSets[dataId], "customClustering") and dbRoot.dataSets[dataId].customClustering
				cacheObject[dataId]["customClustering"] = customClustering
				sd.customClustering = customClustering

			updateLastRequest(dataId)
		else:
			authorized = True


		sd.authorized = True
		setSessionData(dataId, sd)

		return json.dumps({"authorized": authorized})
	else:
		return json.dumps({"authorized": False})


def isAuthorized(dataId):
	if dbRoot.dataSets.has_key(dataId):
		if hasattr(dbRoot.dataSets[dataId], "encrypt") and dbRoot.dataSets[dataId].encrypt:
			sd = getSessionData(dataId)
			return sd.authorized and (dataId in cacheObject)

		return True

	return False


@app.route("/<string:dataId>", methods=['GET', 'POST'])
def dataById(dataId):
	if dbRoot.dataSets.has_key(dataId):
		updateLastRequest(dataId)
		return render_template('index.html')
	else:
		return render_template('index.html')


@app.route("/createDataset", methods=['POST'])
def createDataSet():
	receivedData = request.get_json()
	uid = uuid.uuid1().hex
	print("hello dataset, id = " + uid)

	file = os.path.join(curPath, "uploads/" + uid)

	if "encrypt" in receivedData and receivedData["encrypt"]:
		with open(file, 'wb+') as f:
			f.write(encrypt(bytes(receivedData["pwd"], "utf-8"), bytes(receivedData["fileData"], "utf-8"), False))

		# hash password to store in db
		receivedData["pwd"] = hash_password(receivedData["pwd"])
	else:
		with open(file, 'wb+') as f:
			f.write(receivedData["fileData"].encode("utf-8"))

	dbRoot.dataSets[uid] = dataset.DataSet(receivedData, file)
	transaction.commit()
	return json.dumps(uid)


@app.route("/datasets", methods=['GET'])
def getDataSets():
	global cacheObject

	res = "<table border='1'><tr>"
	res = res + "<th>ID</th>"
	res = res + "<th>originalFilename</th>"
	res = res + "<th>customClustering</th>"
	res = res + "<th>creationDateTime</th>"
	res = res + "<th>lastRequestDateTime</th>"
	res = res + "<th>currently cached</th>"
	res = res + "<th>password protected</th>"
	res = res + "</tr>"

	for dataSet in dbRoot.dataSets:
		res = res + "<tr>"
		res = res + "<td><a href='./" + dataSet + "'>" + dataSet + "</a></td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].originalFilename + "</td>"

		if (hasattr(dbRoot.dataSets[dataSet], "customClustering") and dbRoot.dataSets[dataSet].customClustering):
			res = res + '<td align="center">x</td>'
		else:
			res = res + "<td></td>"

		res = res + "<td>" + dbRoot.dataSets[dataSet].creationDateTime.strftime("%m/%d/%Y, %H:%M:%S") + "</td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].lastRequestDateTime.strftime("%m/%d/%Y, %H:%M:%S") + "</td>"

		if (dataSet in cacheObject):
			res = res + '<td align="center">x</td>'
		else:
			res = res + "<td></td>"

		if (hasattr(dbRoot.dataSets[dataSet], "encrypt") and dbRoot.dataSets[dataSet].encrypt):
			res = res + '<td align="center">x</td>'
		else:
			res = res + "<td></td>"

		res = res + "</tr>"

	res = res + "</table>"

	return res

@app.route("/clearcache", methods=['GET'])
def clearDataCache():
	global cacheObject


	res = ""

	for dataSet in dbRoot.dataSets:
		if dbRoot.dataSets[dataSet].lastRequestDateTime < datetime.datetime.now() - datetime.timedelta(minutes=sessionCacheTimeout):
			if (dataSet in cacheObject):
				del cacheObject[dataSet]

	#cacheObject = {}

	return "cache cleared"


@app.route("/datacache", methods=['GET'])
def getDataCache():
	global cacheObject

	res = "<table border='1'><tr>"
	res = res + "<th>ID</th>"
	res = res + "<th>originalFilename</th>"
	res = res + "<th>creationDateTime</th>"
	res = res + "<th>lastRequestDateTime</th>"
	res = res + "</tr>"

	for dataSet in cacheObject:
		res = res + "<tr>"
		res = res + "<td><a href='./" + dataSet + "'>" + dataSet + "</a></td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].originalFilename + "</td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].creationDateTime.strftime("%m/%d/%Y, %H:%M:%S") + "</td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].lastRequestDateTime.strftime("%m/%d/%Y, %H:%M:%S") + "</td>"
		res = res + "</tr>"

	res = res + "</table>"

	return res

@app.route("/getValueFormat/<string:dataId>", methods=['GET'])
def getValueUnit(dataId):
	if dbRoot.dataSets.has_key(dataId):
		res = {"unit": dbRoot.dataSets[dataId].unit,
			   "decimals": dbRoot.dataSets[dataId].decimals,
			   "unitSpace": dbRoot.dataSets[dataId].unitSpace,
			   "unitPosition": dbRoot.dataSets[dataId].unitPosition}
		return json.dumps(res)
	else:
		return json.dumps("")


@app.route("/getData/<string:dataId>", methods=['GET'])
def getData(dataId):
	global cacheObject

	if not isAuthorized(dataId):
		return json.dumps({"authorized": False})

	updateLastRequest(dataId)

	if (dataId in cacheObject):
		#return getDecryptedDataset(cacheObject[dataId], pwd).to_json(orient='records')
		#return cacheObject[dataId]["dataset"].to_json(orient='records')
		return json.dumps({"customClustering": cacheObject[dataId]["customClustering"], "data": cacheObject[dataId]["dataset"].to_dict(orient='records')})

	if dbRoot.dataSets.has_key(dataId):
		if hasattr(dbRoot.dataSets[dataId], "encrypt") and dbRoot.dataSets[dataId].encrypt:
			return json.dumps({"authorized": False}) # authorization required to decrypt dataset

		cacheObject[dataId] = {}

		customClustering = hasattr(dbRoot.dataSets[dataId], "customClustering") and dbRoot.dataSets[dataId].customClustering

		cacheObject[dataId]["dataset"] = pd.read_csv(dbRoot.dataSets[dataId].file, ";")
		cacheObject[dataId]["dataset"] = prepareDataset(cacheObject[dataId]["dataset"], customClustering)
		cacheObject[dataId]["encrypt"] = False
		cacheObject[dataId]["customClustering"] = customClustering

		sd = getSessionData(dataId)
		sd.customClustering = customClustering
		setSessionData(dataId, sd)

		#return cacheObject[dataId]["dataset"].to_json(orient='records')
		return json.dumps({"customClustering": customClustering, "data": cacheObject[dataId]["dataset"].to_dict(orient='records')})
	else:
		return json.dumps({"errorCode": 1, "message": "Dataset with id " + dataId + " not found"})


@app.route("/getClusters/<string:dataId>/<int:numClusters>", methods=['GET', 'POST'])
def getClusters(dataId, numClusters, tempMem = {}):
	if not isAuthorized(dataId):
		return json.dumps({"authorized": False})

	checkDataCache(dataId)

	updateLastRequest(dataId)

	if request.method == 'GET':
		filteredData = cacheObject[dataId]["dataset"]
	else:
		json_dict = request.get_json()
		filteredData = filterData(cacheObject[dataId]["dataset"], json_dict)

	if cacheObject[dataId]["customClustering"]:
		cluster_idcs = CustomCluster().cluster(filteredData, tempMem, numClusters)
	else:
		cluster_idcs = BiCluster().cluster(filteredData, tempMem, numClusters)

	return json.dumps(cluster_idcs)


@app.route("/getSubClusters/<string:dataId>/<cID>/<int:numClusters>", methods=['POST'])
def getSubClusters(dataId, cID, numClusters, tempMem = {}):
	if not isAuthorized(dataId):
		return json.dumps({"authorized": False})

	updateLastRequest(dataId)

	print(cID)

	clusterID_array = [int(x) for x in cID.split('.')]

	getClusters(dataId, numClusters, tempMem)

	for i, cID in enumerate(clusterID_array[0:]):
		smID = '.'.join(str(x) for x in clusterID_array[:(i + 1)])
		cluster_idcs = BiCluster().subcluster3(smID, tempMem, numClusters)

	#cluster_idcs = BiCluster().subcluster3(cID, cacheObject[dataId], numClusters)
	return json.dumps(cluster_idcs)


@app.route("/removeSubClusters/<string:dataId>/<string:cID>/<int:numClusters>", methods=['POST'])
def removeSubClusters(dataId, cID, numClusters):
	if not isAuthorized(dataId):
		return json.dumps({"authorized": False})

	tempMem = {}
	getSubClusters(dataId, cID, numClusters, tempMem)

	cluster_idcs = BiCluster().removeSubClusters3(cID, tempMem)

	return json.dumps(cluster_idcs)


def filterData(data, filters):
	data_tmp = data.copy()
	for f in filters:
		data_tmp = data_tmp[data_tmp[f].isin(filters[f])]

	return data_tmp


def prepareDataset(data, customClustering):
	dataKeys = data.keys();

	firstGroupIndex = dataKeys[0]

	if customClustering:
		secondGroupIndex = dataKeys[len(dataKeys) - 3]
	else:
		secondGroupIndex = dataKeys[len(dataKeys) - 2]

	data[firstGroupIndex] = data[firstGroupIndex].astype(str)
	data[secondGroupIndex] = data[secondGroupIndex].astype(str)

	return data

def getDecryptedDataset(data, pwd):
	if data["encrypt"]:
		decrypted = StringIO(decrypt(bytes(pwd, "utf-8"), data["dataset"], False).decode("utf-8"))
		decrypted = pd.read_csv(decrypted, sep=";")

		customClustering = hasattr(data, "customClustering") and data.customClustering

		decrypted = prepareDataset(decrypted, customClustering)

		return decrypted

	return data["dataset"]


def encrypt(key, source, encode=True):
    key = SHA256.new(key).digest()  # use SHA-256 over our key to get a proper-sized AES key
    IV = Random.new().read(AES.block_size)  # generate IV
    encryptor = AES.new(key, AES.MODE_CBC, IV)
    padding = AES.block_size - len(source) % AES.block_size  # calculate needed padding
    source += bytes([padding]) * padding  # Python 2.x: source += chr(padding) * padding
    data = IV + encryptor.encrypt(source)  # store the IV at the beginning and encrypt
    return base64.b64encode(data).decode("latin-1") if encode else data


def decrypt(key, source, decode=True):
    if decode:
        source = base64.b64decode(source.encode("latin-1"))
    key = SHA256.new(key).digest()  # use SHA-256 over our key to get a proper-sized AES key
    IV = source[:AES.block_size]  # extract the IV from the beginning
    decryptor = AES.new(key, AES.MODE_CBC, IV)
    data = decryptor.decrypt(source[AES.block_size:])  # decrypt
    padding = data[-1]  # pick the padding value from the end; Python 2.x: ord(data[-1])
    if data[-padding:] != bytes([padding]) * padding:  # Python 2.x: chr(padding) * padding
        raise ValueError("Invalid padding...")
    return data[:-padding]  # remove the padding


def hash_password(password):
	salt = hashlib.sha256(os.urandom(60)).hexdigest().encode('ascii')
	pwdhash = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'),
								  salt, 100000)
	pwdhash = binascii.hexlify(pwdhash)
	return (salt + pwdhash).decode('ascii')


def verify_password(stored_password, provided_password):
	salt = stored_password[:64]
	stored_password = stored_password[64:]
	pwdhash = hashlib.pbkdf2_hmac('sha512',
								  provided_password.encode('utf-8'),
								  salt.encode('ascii'),
								  100000)
	pwdhash = binascii.hexlify(pwdhash).decode('ascii')
	return pwdhash == stored_password

def updateLastRequest(dataId):
	if dbRoot.dataSets.has_key(dataId):
		dbRoot.dataSets[dataId].lastRequestDateTime = datetime.datetime.now()
		transaction.commit()

def getSessionData(dataId):
		if dataId in session:
			return sessionData.SessionData().fromJSON(session[dataId])
		else:
			return sessionData.SessionData()

def setSessionData(dataId, sessionData):
	session[dataId] = sessionData.toJSON()

# @app.route("/setNumClusters", methods=['POST'])
# def setNumClusters():
# 	BiCluster().setNumClusters(request.get_json())
# 	return ""


def dump(obj):
  for attr in dir(obj):
    print("obj.%s = %r" % (attr, getattr(obj, attr)))

if __name__ == "__main__":
	# app.run()
	# app.run(host='0.0.0.0',port=5000)
	app.run(host='localhost', port=5001)
