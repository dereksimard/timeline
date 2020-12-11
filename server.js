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
	}

});

const PartieSchema = new mongoose.Schema({
	date: Date,
	invites: [String]
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
var server = app.listen(8000, function () {
	console.log("Service sur le port 8000");
});

// Static files
app.use(express.static('public'));

/////////////////////////////////////////////////////////////////

// Instanciation du Socket
var io = socket(server);

var dict = {};

var dictJoueurs = {};
var dictMains = {};
var tapis = [];
var tas;

// Lancement du Socket : événement, fonction de rappel
io.on('connection', function (socket) {

	console.log('Socket établi', socket.id);

	//Récupération d'un paramètre (pour nous ça sera l'id de partie)
	var id_partie = socket.handshake.query['id_partie'];
	var id_joueur = socket.handshake.query['id_joueur'];

	//Obtention du nb de joueurs attendus
	var promise = getNbJoueursPartie(id_partie);
	var nbJoueurs;




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
								cartes.splice(carteRnd, 1);
								//Association d'un joueur avec sa main
								dictMains[id] = main;
							}

							//Envoie à un seul joueur
							io.to(dictJoueurs[id]).emit('cartes_pretes', main);
						});

						//Un fois les cartes distribuées, une carte est déposée sur le tapis par le serveur
						carteRnd = Math.floor(Math.random() * cartes.length);
						var carte = cartes[carteRnd];
						tapis.push(carte);
						console.log(carte);
						cartes.splice(carteRnd, 1);
						console.log(tapis);

						//Envoie à tous les joueurs
						io.sockets.to(id_partie).emit('serveur_carte',tapis);


						//Pour que les cartes soient accessibles plus tard
						tas = cartes;

						//Le premier joueur du tableau (premier arrivé) commence son tour

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


		//ne fonctionne pas, le nb doit être dans l'async
		//console.log("dans le async" + nb);
	});

	//Obtention du joueur qui vient de se connecter pour obtenir son nom
	//(fonction async)
	var joueur = getJoueur(id_joueur);


	joueur.then(
		joueur => {
			if (joueur) {
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
		//console.log('position de la carte : ' + data.position);
		//console.log("contenu du tapis : " + tapis);
		console.log("id joueur après déposer carte" + data.id_joueur);

		//Récupération de la main du joueur et de sa carte choisie
		var id_joueur = data.id_joueur;
		var position = parseInt(data.position);
		var nom = data.nom;
		var main = dictMains[id_joueur];
		var trouvee = false;

		for (var i = 0; i < main.length && !trouvee; i++) {
			if (main[i].cue == data.nomCarte) {
				var carte = main[i];
				trouvee = true;
				console.log("trouvée!");
			}
		}
		console.log("carte choisie : " + carte);
		//Validation de la carte (on compare la réponse des cartes juxtaposées à
		//celle déposée)

		var blnReponse = true;
		if (position == 0) {
			if (carte.rep <= tapis[position].rep) {
				console.log("bonne réponse!");
			}
			else {
				console.log("Mauvaise réponse!");
				blnReponse = false;
			}


		}

		else if (position == tapis.length) {
			if (carte.rep >= tapis[position - 1].rep) {
				console.log("bonne réponse!");
			}
			else {
				console.log("Mauvaise réponse!");
				blnReponse = false;
			}
		}
		else {
			if (carte.rep >= tapis[position - 1].rep || carte.rep <= tapis[position].rep) {
				console.log("bonne réponse!");
			}

			else {
				console.log("Mauvaise réponse!");
				blnReponse = false;
			}
		}


		if (blnReponse) {

			//La carte est ajoutée au tapis
			tapis.splice(position, 0, carte);
			io.sockets.to(id_partie).emit('serveur_carte',tapis);

			//TODO : Décompte pour vérifier si le joueur a gagné


		}
		else {
			//Une nouvelle carte est donnée au joueur.
			carteRnd = Math.floor(Math.random() * tas.length);
			var nouvCarte = tas[carteRnd]
			dictMains[id_joueur].push(nouvCarte);
			console.log("Nouvelle carte : " + nouvCarte);

			//On retire du tas la carte donnée et on rajoute celle pour
			//laquelle le joueur a eu une mauvaise réponse
			tas.splice(carteRnd, 1, carte);

		}

		//Peu importe si la réponse est bonne, la carte est retirée de la main
		//du joueur et on lui renvoie sa nouvelle main. Note : ne pas faire 
		//main.splice, car c'est c'est une copie de la main contenue dans le dictionnaire
		var index = main.indexOf(carte);
		dictMains[id_joueur].splice(index, 1);
		io.to(dictJoueurs[id_joueur]).emit('cartes_pretes', dictMains[id_joueur]);

		io.sockets.to(id_partie).emit('serveur_reponse', {
			blnReponse: blnReponse,
			nom: nom
		});


	});

	//taponnage 2
	socket.on('taponnage', function (data) {
		console.log("taponnage 2" + data);
		// Réponse à tous les sockets hormis l'envoyeur
		socket.broadcast.to(id_partie).emit('taponnage', data);
		//socket.broadcast.emit('taponnage', data);
	});

	socket.on('disconnect', function () {
		console.log('utilisateur déconnecté');
	});
});