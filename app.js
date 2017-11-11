const restify = require('restify');
const admin = require("firebase-admin");




const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL
};



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

/*
[Admin] Adds a subscriber to a patient
 */
function addSubscriberToPatient(address, patientId) {
  const patientRef = firebaseDb.ref('patients/' + patientId);
  patientRef.push(
    address
  )
}

function subscribe(req, res, next) {
  const jsonBody = JSON.parse(req.body);
  const address = jsonBody.address;
  const patientId = jsonBody.patientId;
  addSubscriberToPatient(address, patientId);
}




/*
Get status
 */

/*
Update status (For administrators)
 */


/*
const server = restify.createServer();
server.get('/hello/:name', respond);
server.head('/hello/:name', respond);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});


/!*
Subscribe
Body:
  - address
  - patientId
 *!/
server.post('/subscribe', subscribe);*/
