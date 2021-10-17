import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, TextInput, Button } from "react-native";
import * as queries from "./graphql/queries.js";
import * as mutations from "./graphql/mutations";
import { API, graphqlOperation, Auth } from "aws-amplify";

import * as ExpoNotifications from "expo-notifications";

ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const Main = () => {
  const [profile, setProfile] = useState({});
  const [message, setMessage] = useState("");
  const [user, setUser] = useState("");
  const notificationListener = useRef();
  const responseListener = useRef();

  const initialState = useCallback(async () => {
    let authdata;
    const user = await Auth.currentSession()
      .then((data) => {
        console.log(data.idToken.payload.sub);
        setUser(data.idToken.payload.sub);
        authdata = data;
      })
      .catch((err) => {
        console.log(`Error getting User`);
        console.log(err);
      });

    console.log("Getting user profile after user ...");
    const profile = await getUserProfile(authdata.idToken.payload.sub);
    console.log("retreived profile");
    console.log(profile);

    if (profile.expoToken === null || profile.expoToken === "") {
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      if (status !== "granted") {
        alert("No notification permissions!");
        return;
      }

      console.log(`Retreiving expo token`);
      let token = await ExpoNotifications.getExpoPushTokenAsync();
      console.log(`Token ${JSON.stringify(token)}`);
      console.log(`Updating user ${authdata.idToken.payload.sub}`);
      if (token !== "") {
        const inputParams = {
          id: authdata.idToken.payload.sub,
          expoToken: token.data,
        };
        await API.graphql(
          graphqlOperation(mutations.updateUser, { input: inputParams })
        )
          .then((result) => {
            console.log(result);
          })
          .catch((err) => {
            console.log(`Error getting token`);
            console.log(err);
          });
      }
    }
  });

  useEffect(() => {
    initialState();
    console.log(`Starting subscription`);
    notificationListener.current =
      ExpoNotifications.addNotificationReceivedListener((notification) => {
        console.log(notification);
      });

    responseListener.current =
      ExpoNotifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    return () => {
      ExpoNotifications.removeNotificationSubscription(
        notificationListener.current
      );
      ExpoNotifications.removeNotificationSubscription(
        responseListener.current
      );
    };
  }, []);

  const getUserProfile = useCallback(async (sub) => {
    console.log(`Getting user profile from ${sub}`);
    const result = await API.graphql(
      graphqlOperation(queries.getUser, { id: sub })
    )
      .then((result) => {
        // console.log("get User result: ");
        // console.log(result.data.getUser);
        setProfile(result.data.getUser);
        return result.data.getUser;
      })
      .catch((err) => {
        console.log(`Error getting User profile`);
        console.log(err);
      });
    return result;
  });

  const handleSubmit = async () => {
    console.log(`Sending message to profile: ${JSON.stringify(profile)}`);
    const inputParams = {
      message: message,
      token: profile.expoToken,
      name: profile.name,
      email: profile.email,
      id: user,
    };

    console.log(`Submitting following params ${JSON.stringify(inputParams)}`);

    await API.graphql(
      graphqlOperation(mutations.pinpoint, { input: inputParams })
    )
      .then((result) => {
        console.log(result);
        console.log("success");
        setMessage("");
      })
      .catch((err) => {
        console.log(`Error submitting notification`);
        console.log(err);
      });
  };

  return (
    <View style={{ marginTop: 80, marginLeft: 10, marginRight: 10 }}>
      <TextInput
        placeholder="Your push message"
        value={message}
        onChangeText={(input) => setMessage(input)}
        style={{
          paddingLeft: 5,
          height: 40,
          fontSize: 16,
          marginBottom: 6,
          marginTop: 2,
        }}
      ></TextInput>
      <Button title="Submit" onPress={handleSubmit} />
    </View>
  );
};

export default Main;
