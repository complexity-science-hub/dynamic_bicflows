import json
import jsonpickle

class SessionData(object):

    def __init__(self):
        self.authorized = False


    def toJSON(self):
        #return json.dumps(self.__dict__)
        return jsonpickle.encode(self)

    def fromJSON(self, j):
        #self.__dict__ = json.loads(j)
        self = jsonpickle.decode(j)
        return self
