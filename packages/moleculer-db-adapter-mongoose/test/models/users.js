"use strict";

const {Schema, model} = require("mongoose");

const UserSchema = new Schema(
	{
		firstName: {
			type: String,
			required: true,
			trim: true,
		},
		lastName: {
			type: String,
			required: true,
			trim: true,
		},
		postRef: {
			type: String,
			default: "Post"
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
		virtuals: {
			fullName: {
				get() {
					return `${this.firstName} ${this.lastName}`;
				},
			},
			posts: {
				options: {
					ref: "Post",
					localField: "_id",
					foreignField: "author",
					options: { sort: { createdAt: -1 } },
				},
			},
			postCount: {
				options: {
					refPath: "postRef",
					localField: "_id",
					foreignField: "author",
					count: true,
				},
			},
			lastPost: {
				options: {
					ref: "Post",
					localField: "_id",
					foreignField: "author",
					justOne: true,
					options: { sort: { createdAt: -1 } },
				},
			},
		},
	}
);

UserSchema.virtual("lastPostWithVotes", {
	ref: "Post",
	localField: "_id",
	foreignField: "author",
	justOne: true,
	match: { votes: { $gt: 0 } },
	options: { sort: "-createdAt" },
});

module.exports = {
	getModel: (connection) => connection.model("User", UserSchema),
	Model: model("User", UserSchema),
	Schema: UserSchema,
};
