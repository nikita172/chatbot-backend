const mongoose = require("mongoose")
module.exports.connect = function () {
  try {
    mongoose.connect(
      "mongodb+srv://nikita:blahblah@cluster0.yatnxwf.mongodb.net/chatbot-admin-panel?retryWrites=true&w=majority"
    );
  } catch (err) { }
};