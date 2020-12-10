//Ce script va ramener le client vers index.js grâce à io.connection()

//Récupération des éléments du DOM
var positionCarte = document.getElementById('positionCarte');
var btn = document.getElementById('send');

//ul
var output = document.getElementById('output');

var feedback = document.getElementById('feedback');
var titre = document.getElementById('titre');

//ul
var jeu = document.getElementById('jeu');

var numJoueur = document.getElementById('numJoueur');
var nomJoueur = document.getElementById('nomJoueur');

//Autre variables
var carteADeposer;

function gererChoisirCarte(e) {

    var texteCarte = e.target.innerText;


    for (var carte of jeu.childNodes) {
        if (carte.classList.contains('selectionnee')) {
            carte.classList.remove('selectionnee')
        }
    }

    e.target.classList.add("selectionnee");
    carteADeposer = texteCarte;
}

// récupération de l'url accédante
var currentLocation = window.location;

var path = new URL(currentLocation);

// récupération du paramètre
var id_partie = path.searchParams.get("id_partie");
var id_joueur = path.searchParams.get("id_joueur");

window.onload = function () {
    titre.innerHTML += '<h2>Ligne du temps - Partie ' + id_partie + '</h2>';
};

//////////////////////////// WebSocket

// connection au socket            ICI : on retourne vers index.js
var socket = io.connect(path.toString());

//Affichage de l'id du joueur
socket.on('start', function (data) {
    nomJoueur.innerText = data.utilisateur;
    numJoueur.innerText = 'Joueur ' + data.num_joueur + " - ";
});

// Lorsqu'une carte est choisie
btn.addEventListener('click', function () {
    //On envoie le nom de la carte que le joueur veut déposer ainsi que
    //la position où il veut la déposer
    socket.emit('chat', {
        position: positionCarte.value,
        nomCarte: carteADeposer,
        id_joueur: id_joueur,
        nom: nomJoueur.innerText
    });
});

//taponnage 1
positionCarte.addEventListener('keypress', function () {

    socket.emit('taponnage', nomJoueur.innerText);
});

// Écoute d'Événement 'chat' puisque l'utilisateur peut recevoir des messages en plus d'en envoyer
socket.on('chat', function (data) {
    feedback.innerHTML = "";
    output.innerHTML += '<p><strong>' + data.user + ': </strong>' + data.message + '</p>';
});


//taponnage 3
//On indique au serveur qu'un utilisateur est en train de choisir une carte
socket.on('taponnage', function (data) {

    feedback.innerHTML = '<p><em>' + data + ' choisit une carte...' + '</em></p>';
});

//Écoute de l'événement 'cartes_pretes'
socket.on('cartes_pretes', function (cartes) {

    //On supprimer tous les noeuds déjà présents au cas-où ce n'est pas la
    //première fois que la main est reçue.

    while (jeu.lastChild) {
        jeu.removeChild(jeu.lastChild);
    }

    for (var carte of cartes) {
        var li = document.createElement("li");
        li.classList.add("carte");
        li.appendChild(document.createTextNode(carte.cue));
        li.addEventListener('click', gererChoisirCarte, false);
        jeu.appendChild(li);
    }    
})

socket.on('serveur_carte', function (tapis) {

    //Pour supprimer les cartes déjà présentes afin d'éviter des doublons
    while (output.lastChild) {
        output.removeChild(output.lastChild);
    }


    for (var i = 0; i < tapis.length; i++) {
        var li = document.createElement('li');
        li.classList.add("carte");
        var show = document.createElement('span');
        var rep = document.createElement('span');
        show.appendChild(document.createTextNode(tapis[i].show));
        rep.appendChild(document.createTextNode(tapis[i].rep))

        li.appendChild(show);
        li.appendChild(rep);

        var position = document.createElement('li');
        position.classList.add('position');
        position.appendChild(document.createTextNode(i.toString()));
        output.appendChild(position);
        output.appendChild(li);
        
    }

    //Ajout de la dernière position possible (celle la plus à droite)
    var dernPos = document.createElement('li');
    dernPos.classList.add('position');
    dernPos.appendChild(document.createTextNode(tapis.length.toString()));
    output.appendChild(dernPos)


})

socket.on('serveur_reponse', function (data) {

    if (data.blnReponse)
        feedback.innerHTML = '<p><em>' + data.nom + ' a placé CORRECTEMENT sa carte.' + '</em></p>';
    else
        feedback.innerHTML = '<p><em>' + data.nom + ' a placé INCORRECTEMENT sa carte et en a pigé une nouvelle.' + '</em></p>';


})

socket.on('debut_tour', function () {

})

socket.on('fin_tour', function () {

})