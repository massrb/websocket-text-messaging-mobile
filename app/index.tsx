

import { View, Text, TextInput, Button } from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { parseDocument } from "htmlparser2";
import { DomUtils } from "htmlparser2";

export default function App() {
  // for local use: useState("192.168.1.243");
  const [wsIp, setWsIp] = useState("192.168.1.243");
  // const [wsIp, setWsIp] = useState("websocket-server-gjg0.onrender.com"); // State for WebSocket URL
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [serverMessages, setServerMessages] = useState([]);
  const [message, setMessage] = useState(""); // state for input text
  const ws = useRef<WebSocket | null>(null); // perdsist websocket 
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const connectToSocket = () => {
    
    if (ws.current) {
      ws.current.close();
    }

    let wsUrl = `ws://${wsIp}/cable`
    console.log(`Set websocket to ${wsUrl}`)
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("✅ WebSocket Connected to:", wsIp);
      // to send message you can use like that :   ws.send("Hello, server!"); 
      setIsConnected(true); // Update state to reflect successful connection
      const subscribeMessage = {
        command: "subscribe",
        identifier: JSON.stringify({ channel: "PhoneConnectChannel" }) // Change "ChatChannel" to your actual channel name
      };
      ws.current.send(JSON.stringify(subscribeMessage));
      console.log("Subscribed to ChatChannel");
    };

    ws.current.onmessage = (e) => {
      let obj = JSON.parse(e.data)
      console.log("Websocket message", obj)
      if (obj?.type != 'ping') {
        let htmlString = obj?.message?.content;
        console.log('Websocket html', htmlString)
        if (htmlString) {
          console.log("Websocket parse HTML:", htmlString);
          const doc = parseDocument(htmlString);
          const pElement = DomUtils.findOne(el => el.name === "p", doc.children);
          const pText = DomUtils.textContent(pElement)?.trim();
          console.log("Websocket text:", pText);
          setServerMessages((prevMessages) => [...prevMessages.slice(-9), pText]);
        }
      }
    };

    ws.current.onerror = (e) => {
      console.log("WebSocket error on URL:", wsUrl);
      console.error("❌ websocket Err:", e.message, e);
      if (typeof e.message === 'string') {
        console.log("Websocket Error message:", e.message);
      } else {
       try {
         console.log("Websocket Full error (stringified):", JSON.stringify(e));
       } catch (_) {
        console.log("Couldn't stringify the WebSocket error", e);
       }
      }
      setIsConnected(false); // Update state if there is an error
    };

    ws.current.onclose = (e) => {
      console.log("React-Native WebSocket connection closed:", e.code, e.reason);
      setIsConnected(false); // Update state if the connection closes
    };

    // Clean up WebSocket connection when the component unmounts
    return () => {
      ws.current?.close();
    };
  };

  const sendMessage = () => {
    console.log('in sendMessage()')
    if (message.trim() && ws.current?.readyState === WebSocket.OPEN) {
      console.log('socket seems ok')
      const sendData = {
        command: "message",
        identifier: JSON.stringify({ channel: "PhoneConnectChannel" }),
        data: JSON.stringify({ action: "speak", message: {content: message.trim()} }),
      };
      ws.current.send(JSON.stringify(sendData));
      setMessage(""); // Clear input after sending
    }
  };

  return (
    <View>
      <View style={{ marginVertical: 50 }} />
      <TextInput
        style={{
          height: 40,
          borderColor: "gray",
          borderWidth: 1,
          marginBottom: 10,
          paddingHorizontal: 10,
          fontSize: 20
        }}
        placeholder="Enter WebSocket URL..."
        value={wsIp}
        onChangeText={(text) => setWsIp(text)}
        onSubmitEditing={connectToSocket}
      />
      <Button title="Connect" onPress={connectToSocket} />
      <Text style={{ color: "blue", fontSize: 20 }}>
        {isConnected ? "Connected to WebSocket" : `Not connected to ${wsIp}`}
      </Text>
      {(serverMessages.length > 0) ? (
        <>
        {console.log('length:', serverMessages.length)}
        {serverMessages.map((item, index) => (
          <Text key={index} style={{color: "green"}}>{item}</Text>
        ))}
        </>
      ) : (
        <Text style={{ color: "gray" }}>No message from server yet</Text>
      )}
    {/* Input for sending messages */}
      <TextInput
        style={{
          height: 40,
          borderColor: "gray",
          borderWidth: 1,
          marginTop: 20,
          paddingHorizontal: 10,
        }}
        placeholder="Type a message..."
        value={message}
        onChangeText={setMessage}
        onSubmitEditing={sendMessage} // Send on enter
      />
      <Button title="Send" onPress={sendMessage} />  
    </View>
  );
}