"use strict";

var jwt = require('jsonwebtoken');
const secret = require('../secret.js');

var express = require('express');
//Pour aller chercher le cookie dans la requête
var cookieParser = require('cookie-parser');
//Pour prévenir le CSRF
var csrf = require('csurf')

const app = express();
app.use(cookieParser());


// Les models
var utilisateurModel = require('../database/Utilisateur');

// Sert à authentifier l'utilisateur lorsqu'il demande une page. Seuls les
// utilisateurs authentifier peuvent accéder aux ressources du site (sauf)
// les pages d'accueil, d'inscription et de connexion).

var checkToken = (req, res, next) => {
  //var token = req.headers['x-access-token'] || req.headers['authorization'];
  var tokens = req.cookies;
  var token = tokens['token'];


  console.log("le token est " + token);
  if (token) {
    if (token.startsWith('Bearer ')) {
      // Nettoyage de la chaîne contenant le token
      token = token.slice(7, token.length);
    }

    jwt.verify(token, secret.secret, (err, decoded) => {
      if (err) {
        return res.json({
          success: false,
          message: 'Token is not valid'
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res.json({
      success: false,
      message: 'Auth token is not supplied'
    });
  }
};

//Est utilisé afin de s'assurer que les crédences ne sont pas vides. Il est 
//inutile de faire une requête à la BD si un input est manquant
var validerSiCredencesVides = (req, res, next) => {
  // Vérifier si les crédences de l'utilisateur sont vides
  var courriel = req.body.courriel.trim();
  var mdp = req.body.mdp.trim();

  if (courriel === "" || mdp === "") {
    return res.send({
      success: false,
      message: "Courriel et mot de passe Obligatoires pour se connecter"
    });
  }
  else {
    //On peut passer à l'étape suivante : valider la combinaison courriel-mdp
    req.body.courriel = courriel;
    req.body.mdp = mdp;
    next();
  }
};

//Est utilisé lors de la création d'une partie/d'invitations afin de valider
//les courriels. On ne veut pas insérer des courriels invalides dans la BD
var validerJoueurs = (req, res, next) => {
  //Possibilité d'inviter 3 joueurs
  var courriel1 = req.body.courriel1;
  var courriel2 = req.body.courriel2;
  var courriel3 = req.body.courriel3;

  console.log(courriel1);
  console.log(courriel2);
  console.log(courriel3);

  //On trim si l'input n'est pas null
  if (!courriel1)
    courriel1 = courriel1.trim();
  if (!courriel2)
    courriel2 = courriel2.trim();
  if (!courriel3)
    courriel3 = courriel3.trim();


  //Si le courriel n'est pas vide, on l'ajoute dans le tableau des courriels
  //à valider
  var courriels = [];
  if (courriel1 !== "")
    courriels.push(courriel1);
  if (courriel2 !== "")
    courriels.push(courriel2);
  if (courriel3 !== "")
    courriels.push(courriel3);

  //Le nombre de courriels non-vides doit être au minimum de 1 puisque
  //le nombre minimal de joueur est de 2 (créateur + 1 invité)
  if (courriels.length < 1) {
    return res.send({
      success: false,
      message: "Il faut inviter au moins 1 joueur."
    });
  }
  else {
    //1 validation = 1 promesse
    var promises = [];
    for (var i = 0; i < courriels.length; i++) {
      console.log(courriels[i]);
      promises.push(utilisateurModel.findOne({ courriel: courriels[i] }));
    }
    //On résout toutes les promesses en parallèle
    Promise.all(promises).then(
      (results) => {

        var courrielsValides = [];
        var valide = true;
        var i = 0;
        //La variable results est un tableau contenant les résultats. Si un des
        //résultats est null, ça signifie qu'un des courriels est invalide et
        //on arrête tout.
        do {

          if (results[i] === null) {
            valide = false;
          }
          i++;
        } while (valide === true && i < results.length);

        //Tous les courriels sont valides, on passe à l'étape suivante
        if (valide === true) {
          results.forEach(r => {
            courrielsValides.push(r.courriel);
          });
          req.courriels = courrielsValides;
          next();
        }
        else {
          return res.send({
            success: false,
            message: "Au moins 1 courriel est invalide."
          });
        }


      },
      (errors) => {
        console.log(errors);
      });


  }

};


module.exports = {
  checkToken: checkToken,
  validerCredencesVides: validerSiCredencesVides,
  validerJoueurs: validerJoueurs

}