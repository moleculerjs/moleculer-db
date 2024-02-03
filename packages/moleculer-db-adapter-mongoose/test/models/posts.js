"use strict";

const {Schema, model} = require("mongoose");

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
		type: Schema.ObjectId,
		ref: "User"
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
	getModel: (connection) => connection.model("Post", PostSchema),
	Model: model("Post", PostSchema),
	Schema: PostSchema
};
