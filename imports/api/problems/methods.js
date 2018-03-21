import { Meteor } from 'meteor/meteor'
import { UserData, Wallet, Problems, ProblemImages, ProblemComments, devValidationEnabled } from '/imports/api/indexDB'
import SimpleSchema from 'simpl-schema';

export const newProblem = new ValidatedMethod({
  name: 'newProblem',
  // Validation function for the arguments. Only keyword arguments are accepted,
  // so the arguments are an object rather than an array. The SimpleSchema validator
  // throws a ValidationError from the mdg:validation-error package if the args don't
  // match the schema
  validate: //null,
  new SimpleSchema({
    type: String,
    header: {type: String, max: 80, /*label: "summary above 80 characters"*/}, //label makes it into the error, but it's concatenated with default error message
    text: String,
    images: [String],
    bounty: Number,
  }, {requiredByDefault: false && devValidationEnabled}).validator(),

  // This is the body of the method. Use ES2015 object destructuring to get
  // the keyword arguments
  run({ type, header, text, images, bounty }) {
    if (~['bug', 'feature', 'question'].indexOf(type)) {
			if (Meteor.userId()) {
				if (bounty > 0) { // check if the user can finance the bounty
					let user = UserData.findOne({
						_id: Meteor.userId()
					})

					if (user.balance < bounty) {
						throw new Meteor.Error('Error.', 'Insufficient funds.')
					}
				}

				Problems.insert({
					type: type,
					header: header,
					text: text,
					images: images,
					createdBy: Meteor.userId(),
					date: new Date().getTime(),
					credit: [{
						userId: Meteor.userId(),
						bounty: bounty
					}],
					open: true,
					solved: false,
					taken: {},
					locked: false,
					cancelled: false,
					votes: [],
					score: 0
				})

				if (bounty > 0) { // take the bounty from user's wallet
					UserData.upsert({
						_id: Meteor.userId()
					}, {
						$inc: {
							balance: -bounty
						}
					})

				    Wallet.insert({
				    	time: new Date().getTime(),
				    	owner: Meteor.userId(),
				    	type: 'transaction',
				      	from: 'Blockrazor',
				      	message: `${bounty} KZR has been reserved from your account for funding a problem.`,
				      	amount: -bounty,
				     	read: false
				    })
				}
			} else {
				throw new Meteor.Error('Error.', 'You have to be logged in.')
			}
		} else {
			throw new Meteor.Error('Error.', 'Invalid type.')
		}
  }
});