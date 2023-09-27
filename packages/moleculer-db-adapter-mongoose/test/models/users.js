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
					ref: "Post",
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

module.exports = {
	getModel: (connection) => connection.model("User", UserSchema),
	Model: model("User", UserSchema),
	Schema: UserSchema,
};
