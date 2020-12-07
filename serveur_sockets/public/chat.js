"use strict";
//Ce script va ramener le client vers index.js grâce à io.connection()

//Récupération des éléments du DOM
var message = document.getElementById('message');
user = document.getElementById('user'),
    btn = document.getElementById('send'),
    output = document.getElementById('output'),
    feedback = document.getElementById('feedback');
titre = document.getElementById('titre');
jeu = document.getElementById('jeu');
joueur = document.getElementById('joueur');

// récupération de l'url accédante
var currentLocation = window.location;

var path = new URL(currentLocation);

// récupération du paramètre
var param = path.searchParams.get("id_partie");

window.onload = function () {
    titre.innerHTML += '<h2>Ligne du temps - Partie ' + param + '</h2>';
};

//////////////////////////// WebSocket

// connection au socket            ICI : on retourne vers index.js
var socket = io.connect(path.toString());

//Affichage de l'id du joueur
socket.on('start', function (data) {
    //alert("ABCDEF"+data[2]);
    // var utilisateur = data.joueur;
    // var num_joueur = data.num_joueur;
    joueur.innerHTML = '<p><strong>Joueur ' + data.num_joueur + ' - '+ data.utilisateur+ '</strong></p>' + '<p id="carte1" class="carte">';
});

// Événement
btn.addEventListener('click', function () {
    //On associe des données avec l'évènement 'chat'
    socket.emit('chat', {
        message: message.value,
        user: user.value
    });
});

message.addEventListener('keypress', function () {
    socket.emit('taponnage', user.value);
});

// Écoute d'Événement 'chat' puisque l'utilisateur peut recevoir des messages en plus d'en envoyer
socket.on('chat', function (data) {
    feedback.innerHTML = "";
    output.innerHTML += '<p><strong>' + data.user + ': </strong>' + data.message + '</p>';
});

//On indique au serveur qu'un utilisateur est en train d'écrire un message
socket.on('taponnage', function (data) {
    feedback.innerHTML = '<p><em>' + data + ' écrit un message...' + '</em></p>';
});

//Écoute de l'événement 'cartes_pretes'
socket.on('cartes_pretes', function (cartes, joueur) {

    var html = '';
    for (var carte of cartes) {
        html = html + '<li class="carte">' + carte.cue + '</li>';
    }
    //output.innerHTML = html;
    jeu.innerHTML = html;
})