"use strict";

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


var nomJoueur = document.getElementById('nomJoueur');

//Autre variables
var carteADeposer;
var partieFini = false;

function gererChoisirCarte(e) {

    var texteCarte = e.target.innerText;

    for (var carte of jeu.childNodes) {
        if (carte.classList.contains('selectionnee')) {
            carte.classList.remove('selectionnee');
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

// connection au socket
var socket = io.connect(path.toString());

//Affichage du nom du joueur
socket.on('start', function (data) {
    nomJoueur.innerText = data.utilisateur;
});

// Lorsqu'une carte est choisie
btn.addEventListener('click', function () {
    //On envoie le nom de la carte que le joueur veut déposer ainsi que
    //la position où il veut la déposer
    if (!partieFini) {

        if (carteADeposer == null) {
            //La position donné est invalide
            feedback.innerHTML = '<p>Veuillez choisir une <strong>CARTE</strong>.</p>';
            feedback.classList.add('invalide');
        }
        else if (positionCarte.value != null || positionCarte.value < 0) {
            //La position donné est invalide
            feedback.innerHTML = '<p>Veuillez choisir une <strong>CARTE</strong>.</p>';
            feedback.classList.add('invalide');
        }
        else {
            socket.emit('chat', {
                position: positionCarte.value,
                nomCarte: carteADeposer,
                id_joueur: id_joueur,
                nom: nomJoueur.innerText
            });
        }
    }
    else {
        location.href = "https://lotptimeline.herokuapp.com";
    }
});

//taponnage 1
positionCarte.addEventListener('keypress', function () {
    feedback.classList.remove('invalide');
    alert(positionCarte.value);
    socket.emit('taponnage', nomJoueur.innerText);
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
});

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
        rep.appendChild(document.createTextNode(tapis[i].rep));

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
    output.appendChild(dernPos);
});

socket.on('serveur_reponse', function (data) {
    if (data.blnVictoire) {
        feedback.innerHTML = '<p><em>' + data.nom + 'a GAGNÉE la partie.' + '</em></p>';
        btn.innerHTML = '<a href="https://lotptimeline.herokuapp.com/connexion"/>';
        partieFini = true;
    }
    else {
        if (data.blnReponse)
            feedback.innerHTML = '<p><em>' + data.nom + ' a placé CORRECTEMENT sa carte.' + '</em></p>';
        else
            feedback.innerHTML = '<p><em>' + data.nom + ' a placé INCORRECTEMENT sa carte et en a pigé une nouvelle.' + '</em></p>';
    }
});

//Indique au joueur que c'est son tour + débloque son bouton
socket.on('mon_tour', function () {
    feedback.innerHTML = '<p>C\'est <strong>VOTRE</strong> tour.</p>';
    btn.removeAttribute('disabled');
});

//Indique aux joueurs que c'est le tour de quelqu'un + bloque leur bouton
socket.on('son_tour', function () {
    feedback.innerHTML = '<p>Ce <strong>N\'EST PAS</strong> votre tour.</p>';
    btn.setAttribute('disabled', 'disabled');
});

