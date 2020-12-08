"use strict";

var express = require('express');
var router = express.Router();

var secret = require('../secret');

//Pour aller chercher le cookie dans la requête
var cookieParser = require('cookie-parser');
//Pour la création d'un token
var jwt = require('jsonwebtoken');

const app = express();
app.use(cookieParser());


//Middleware
var middleware = require('./middleware');

// Mongoose
var mongoose = require('mongoose');
mongoose.connect('mongodb+srv://admin:admin123@timeline.9e4sd.mongodb.net/timeline?retryWrites=true&w=majority',
  { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false });
var db = mongoose.connection;

// Les models
var utilisateurModel = require('../database/Utilisateur');
var partieModel = require('../database/Partie');

/*===========================================================================*/

/* GET : Obtenir le formulaire de connexion*/
router.get('/', function (req, res, next) {
  res.render('login_form', { title: 'Timeline Online' });
});


/*  POST : Retour du formulaire complété */
router.post('/', middleware.validerCredencesVides, function (req, res) {

  //Si les crédences ne sont pas vides, on valide la combinaison courriel-mdp
  utilisateurModel.findOne({ courriel: req.body.courriel, mdp: req.body.mdp }, function (err, utilisateur) {

    // Si l'utilisateur existe, on fait le ménage dans ses invitations
    if (!err && utilisateur) {
      //Pour résoudre la promesse retournée, il faut utiliser .then
      retirerInvitationsPerimees(utilisateur).then(
        
        //Si retirer les invitations périmées a fonctionné
        function (result) {
          utilisateur.invitations = result;

          // Mettre à jour l'utilisateur
          utilisateurModel.findOneAndUpdate({_id:utilisateur._id},  { invitations: result }).exec(function (err, utilisateurModif) {
            if (!err) {
              //Création du token d'authentification
              var token = jwt.sign({ nom: utilisateur.nom }, secret.secret, { expiresIn: '24h' });
              //res.setHeader('x-access-token', token);
              res.cookie('token',token, {expires:new Date(Date.now()+900000), httpOnly:true} )
              //res.send({ id:utilisateurModif._id,nom: utilisateurModif.nom, invitations: utilisateurModif.invitations });
              res.redirect('utilisateurs/' + utilisateur.id + '/parties');

          

            }
          });
        },
        //Si retirer les invitations n'a PAS fonctionné
        function (error) {
          console.log("err");
        }
      );
    }
    else {
      // L'utilisateur n'existe pas et on redirige vers la page de connexion avec un message d'erreur
      res.render('login_form', { title: 'Timeline Online', erreur: 'Le courriel et le mot de passe ne correspondent pas' });
    }
  });
});

module.exports = router;



async function retirerInvitationsPerimees(utilisateur) {
  // Ménage des invitations du joueur : on conserve seulement les non périmées
  var invitationsValides = [];

  for (var id_partie of utilisateur.invitations) {
    await partieModel.findById(id_partie, function (err, partie) {

      if (partie != null && partie.date >= Date.now()) {
        invitationsValides.push(partie.id);
        //console.log("partie pushée" + partie.id);
      }
      else {
        console.log("La partie" + id_partie+ "est périmée ou n'existe pas");
      }
    });

  }//fin foreach
  console.log("dans la fonction : " + invitationsValides)
  return invitationsValides;
}





