"use strict";

let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let PostSchema = new Schema({
	title: {
		type: String,
		trim: true
	},
	content: {
		type: String,
		trim: true
	},
	votes: {
		type: Number,
		default: 0
	},
	author: {
		type: Schema.ObjectId
	}

}, {
	timestamps: true
});

// Add full-text search index
PostSchema.index({
	//"$**": "text"
	"title": "text",
	"content": "text"
});

module.exports = {
	Model: mongoose.model("Post", PostSchema),
	Schema: PostSchema
};
