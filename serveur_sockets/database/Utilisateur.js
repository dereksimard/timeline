"use strict";

const { ObjectId } = require('mongodb');
// Mongoose
var mongoose = require('mongoose');
var validator = require('validator')

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
        required:[true, 'Courriel obligatoire'],
        lowercase:true,
        validate:(value)=>{
            return validator.isEmail(value)
        }
    },
    main: [{ carte: Number }],
    invitations: [ObjectId]



});

module.exports = mongoose.model('Utilisateur', UtilisateurSchema);