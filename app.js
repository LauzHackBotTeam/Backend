const restify = require('restify');
const request = require('request');
const admin = require("firebase-admin");


const server = restify.createServer();

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());


const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL
};


const DIRECTLINE_URL = "https://directline.botframework.com/v3/directline";
const DIRECTLINE_SECRET = process.env.DIRECTLINE_SECRET;


function sendMessageToBotUser(address, message) {
  const payload = {
    type: "trigger",
    from: {
      id: "12345678"
    },
    value: {
      address: address,
      text: message
    }
  };
  createConversation((conversationId) => {
    request({
      method: 'POST',
      url: DIRECTLINE_URL + 'conversations/' + conversationId + '/activities',
      headers: {
        Authorization: `Bearer ${DIRECTLINE_SECRET}`,
        "Content-Type": "application/json"
      },
      body: payload,
      json: true
    }, (err, result, body) => {
      if (err) {
        console.log('Error');
      }
    })
  });

  
}


// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(__dirname + '/firebaseCredentials.json'),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
const firebaseDb = admin.database();

/*
[Admin] Adds a new patient to the system
 */
function addPatient(name, surname, age, condition) {
  const patientsRef = firebaseDb.ref("patients");
  patientsRef.push({
    name: name,
    surname: surname,
    age: age,
    condition: condition
  });
}








function getUser(patientId, callback) {
  const patientRef = firebaseDb.ref('patients/' + patientId);
  patientRef.once("value", function(data) {
    callback(data.val());
  });
}



/*
Get status
 */

/*
Update status (For administrators)
 */


server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});

server.get('/:patientId/surgery', getSurgeryAPI);

function getSurgeryAPI(req, res, next) {
  const patientId = req.params.patientId;
  getSurgery(patientId, (surgery) => {
    res.json(200, surgery);
  })
}


function getSurgery(patientId, callback) {
  const surgeryRef = firebaseDb.ref('surgeries/' + patientId);
  surgeryRef.once("value", function(data) {
    callback(data.val());
  });
}

function surgeryListener() {
  const surgeryRef = firebaseDb.ref('surgeries/');
  surgeryRef.on('child_changed', function (snapshot, key) {
    const surgeryInfo = snapshot.val();
    const patientId = snapshot.key;
    getUser(patientId, (user) => {
      for (let relative in user.relativesSubscribed) {
        let relativeContent = user.relativesSubscribed[relative]
        sendMessageToBotUser(relativeContent.address, surgeryInfo.status);
      }
      console.log(patientId);
    });
  })
}

surgeryListener();

server.put('/:patientId/surgery', updateSurgeryAPI);

function updateSurgeryAPI(req, res, next) {
  const patientId = req.params.patientId;
  const surgery = req.body;
  updateSurgery(surgery, patientId);
  res.json(200);
}

function updateSurgery(surgery, patientId) {
  const surgeryRef = firebaseDb.ref('surgeries/' + patientId);
  surgeryRef.set(surgery);
}



server.post('/:patientId/surgery', addSurgeryAPI);

function addSurgeryAPI(req, res, next) {
  const patientId = req.params.patientId;
  addSurgery(patientId);
  res.send(200, {
    message: 'Surgery successfully added'
  })
}

function addSurgery(patientId) {
  const patientRef = firebaseDb.ref('surgeries/');
  patientRef.child(patientId).set({
    status: 'Not started',
    message: 'The surgery has not started yet'
  });
}



server.get('/:patientId/menu', getMenuAPI);

function getMenuAPI(req, res, next) {
  const patientId = req.params.patientId;
  getUser(patientId, (user) => {
    const todaysMenu = user.todaysMenu;
    if (todaysMenu) {
      res.json(200,
        todaysMenu
      )
    } else {
      res.json(404, {
        error: "Menu not found for today"
      })
    }
  })
};

server.post('/:patientId/menu', addMenuAPI);

function addMenu(menu, patientId) {
  const patientRef = firebaseDb.ref('patients/' + patientId + '/todaysMenu');
  patientRef.set(
    menu
  );
}

function addMenuAPI(req, res, next) {
  const patientId = req.params.patientId;
  const jsonBody = req.body;
  addMenu(jsonBody, patientId);
  res.send(200);
}


server.post('/subscribe', subscribe);

function subscribe(req, res, next) {
  const jsonBody = req.body;
  const address = jsonBody.address;
  const patientId = jsonBody.patientId;
  addSubscriberToPatient(address, patientId);
  //surgeryListener(patientId);
  getUser('daniellimia', (user) => {
    res.json(200, {
      name: user.name + ' ' + user.surname
    })
  });
}

/*
[Admin] Adds a subscriber to a patient
 */
function addSubscriberToPatient(address, patientId) {
  const patientRef = firebaseDb.ref('patients/' + patientId + '/relativesSubscribed');
  patientRef.push({
    address
  });
}


/*
Directline: Create conversation
*/
let createConversation = (cb) => {
  request({
    method: 'POST',
    url: `${DIRECTLINE_URL}/conversations`,
    headers: {
      Authorization: `Bearer ${DIRECTLINE_SECRET}`
    }
  }, (err, resp, body) => {
    if(err) return console.log(err);
    cb(resp.conversationId);
  });
}