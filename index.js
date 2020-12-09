"use strict";

var express = require('express');
var socket = require('socket.io');
var mongoose = require('mongoose');

//Models
//cue = ce que l'utilisateur voit
//show = ce qui est montré sur la ligne du temps
const CarteSchema = new mongoose.Schema({
	cue: String,
	show: String,
	rep: Number
});

const UtilisateurSchema = new mongoose.Schema({
	nom: {
		type: String,
		required: 'Nom obligatoire.'
	},
	mdp: {
		type: String,
		required: [true, 'Mot de passe obligatoire']
	},
	courriel: {
		type: String,
		unique: [true, 'Doit être unique'], //Attention, n'est pas un validator
		required: [true, 'Courriel obligatoire'],
		lowercase: true,
		validate: (value) => {
			return validator.isEmail(value)
		}
	},
	main: [Number],
});

const PartieSchema = new mongoose.Schema({

	date: Date,
	invites: [String],
	pioche: [{ carte: Number }],
	tapis: [{ carte: Number }]
});

var carteModel = mongoose.model('Carte', CarteSchema);
var utilisateurModel = mongoose.model('Utilisateur', UtilisateurSchema);
var partieModel = mongoose.model('Partie', PartieSchema);

mongoose.connect('mongodb+srv://admin:admin123@timeline.9e4sd.mongodb.net/timeline?retryWrites=true&w=majority',
	{ useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false });
var db = mongoose.connection;

//Déclarations
var nbTours = 0;

async function getCartes() {
	var tab_cartes = []
	console.log("2-juste avant le find");
	await carteModel.find(null, function (err, cartes) {

		for (var carte of cartes) {
			tab_cartes.push(carte);
		}

	});
	return tab_cartes;
}

async function getJoueur(id_joueur) {

	return await utilisateurModel.findById(id_joueur);
}

async function getNbJoueursPartie(id_partie) {
	//Conversion de l'id de type String en ObjectId
	var objId = mongoose.Types.ObjectId(id_partie);
	return partieModel.aggregate([{ $match: { _id: objId } }, { $project: { nbJoueursAttendus: { $size: '$invites' }, _id: 0 } }]);

	// await promise.then(
	// 	result=>{
	// 		console.log("dans la fonction" + result);
	// 		return result;
	// 	},
	// 	error=>{}
	// );
	//return nbJoueursAttendus;
}

var cartes = getCartes();

// App setup
var app = express();

console.log("Service sur le port 3000");

var server = app.listen(process.env.PORT || 3000, function () {
	console.log("Service sur le port 3000");
});

console.log("Service sur le port 3000");

// Static files
app.use(express.static('public'));

/////////////////////////////////////////////////////////////////

// Instanciation du Socket
var io = socket(server);

var dict = {};
var dictJoueurs = {};

// Lancement du Socket : événement, fonction de rappel
io.on('connection', function (socket) {

	console.log('Socket établi', socket.id);

	//Récupération d'un paramètre (pour nous ça sera l'id de partie)
	var id_partie = socket.handshake.query['id_partie'];
	var id_joueur = socket.handshake.query['id_joueur'];

	//Obtention du nb de joueurs attendus
	var promise = getNbJoueursPartie(id_partie);
	var nb;
	dict[id_partie] = 0;

	promise.then(result => {
		nbJoueurs = result[0].nbJoueursAttendus;

		//Si la clé id_joueur n'est pas dans le dictionnaire, on l'ajoute
		//clé = id_joueur, valeur = socket
		if (!(id_joueur in dictJoueurs)) {			
			dict[id_partie] += 1;
			dictJoueurs[id_joueur] = socket.id;
			console.log("Le joueur " + dict[id_partie] + " est " + id_joueur + "et a le socket " + socket.id);

		}
		console.log("    ");
		if (Object.keys(dictJoueurs).length == nbJoueurs) {
			//Tout le monde est là, on peut distribuer les cartes
			cartes.then(
				cartes => {
					if (cartes) {
					
						var carteRnd;
						//Pour chaque joueur, on crée une main avec des cartes
						//sélectionnées au hasard. On fait un emit pour chaque
						//joueur.
						Object.keys(dictJoueurs).forEach(id => {
							var main = [];
							for (var i = 0; i < 5; i++) {							
								carteRnd = Math.floor(Math.random() * cartes.length);
								main.push(cartes[carteRnd]);
							}
						
							io.to(dictJoueurs[id]).emit('cartes_pretes', main);					
							
						});					

					
					}
					else {
						console.log("pas de cartes trouvés");
					}
				},
				error => {
					console.log(error);
				}


			);

		}

		// if (id_partie in dict) {

		// 	console.log(dict);
		// 	console.log('utilisateur : ' + dict[id_partie]);
		// }
		// else if (dict[id_partie] == nb) {
		// 	//On peut commencer les tours

		// }
		// else {
		// 	dict[id_partie] = 1;
		// 	console.log('Premier utilisateur');

		// }

		//ne fonctionne pas, le nb doit être dans l'async
		//console.log("dans le async" + nb);
	});

	//Obtention du joueur qui vient de se connecter pour obtenir son nom
	//(fonction async)
	var joueur = getJoueur(id_joueur);


	joueur.then(
		joueur => {
			if (joueur) {
				//console.log("dans le then, joueur " + joueur);
				// envoi au client à la connection (envoie d'évènement) (nous on renverrait l'id du joueur)
				//Cet émit est attrapé par socket.on(start, callback) dans le client (chat)
				// var data = {
				// 	num_joueur: dict[id_partie],
				// 	joueur: joueur
				// }
				socket.emit('start', {
					num_joueur: dict[id_partie],
					utilisateur: joueur.nom
				});
			}
			else {
				console.log("pas de joueur trouvé");
			}
		},
		error => {
			console.log(error);
		}
	);






	// Optionnel : Attacher le socket à un espace nommé
	//socket.join('jeu'); De cette façon, on permet à un certain utlisateur
	//de joindre un espace restraint.
	socket.join(id_partie);

	// Gestion d'événement lancé depuis un socket
	socket.on('chat', function (data) {
		console.log('données reçues' + data);
		// Réponse à tous les sockets
		//io.sockets.emit('chat',data); -->si on veut envoyer l'événement à TOUS le monde, même ceux pas inclus dans la partie
		// ci-dessous : + room
		io.sockets.to(id_partie).emit('chat', data);		// Ici, on envoie le message seulement à ceux qui font partie de la id_partie
		// ci-dessous : + namespace + room
		//io.of('/').to('jeu').emit('chat',data);
	});

	socket.on('taponnage', function (data) {
		// Réponse à tous les sockets hormis l'envoyeur
		socket.broadcast.to(id_partie).emit('taponnage', data);
		//socket.broadcast.emit('taponnage', data);
	});

	socket.on('disconnect', function () {
		console.log('utilisateur déconnecté');
	});
});