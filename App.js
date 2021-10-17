import React from "react";
import { withAuthenticator } from "aws-amplify-react-native";
import Amplify, { Analytics } from "aws-amplify";
// Get the aws resources configuration parameters
import awsconfig from "./src/aws-exports"; // if you are using Amplify CLI
import Main from "./src/Main";
Amplify.configure(awsconfig);
Analytics.disable(); // disabled analytics otherwise you get annoying messages

const App = () => {
  return <Main />;
};

export default withAuthenticator(App);
