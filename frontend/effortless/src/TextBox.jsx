// src/TextBox.js
import React, { useState, useEffect } from 'react';
import './TextBox.css'; // Import the CSS file
import { useSendTransaction, useAccount } from 'wagmi'; // Wagmi hook

const exampleTexts = [
  "Send 10 ETH to kalzak.eth",
  "Approve UniswapV4 to spend 1000 of my DAI",
  "Bridge 4337 USDC from Ethereum to Polygon",
  "Provide liquidity to the USDC/ETH pool on 1inch",
  "Send an on-chain message to vitalik.eth"
];

const TextBox = () => {
  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(100);
  const [userHasTyped, setUserHasTyped] = useState(false); // Track user input
  const [isFocused, setIsFocused] = useState(false); // Track if input is focused
  const [inputValue, setInputValue] = useState(''); // Store user input

  // Destructure the useSendTransaction hook to get sendTransaction function
  const { data: hash, sendTransaction } = useSendTransaction();
  const { address } = useAccount();

  useEffect(() => {
    let typingTimeout;
    let currentText = exampleTexts[index];

    if (!userHasTyped && !isFocused) { // Run animation if no user input and not focused
      if (!isDeleting && displayText !== currentText) {
        typingTimeout = setTimeout(() => {
          setDisplayText(currentText.substring(0, displayText.length + 1));
        }, typingSpeed);
      } else if (isDeleting && displayText !== '') {
        typingTimeout = setTimeout(() => {
          setDisplayText(currentText.substring(0, displayText.length - 1));
        }, typingSpeed / 2);
      } else if (displayText === currentText && !isDeleting) {
        setTimeout(() => setIsDeleting(true), 1000);
      } else if (isDeleting && displayText === '') {
        setIsDeleting(false);
        setIndex((prevIndex) => (prevIndex + 1) % exampleTexts.length);
        setLoopNum(loopNum + 1);
      }
    }

    return () => clearTimeout(typingTimeout);
  }, [displayText, isDeleting, index, loopNum, userHasTyped, isFocused]);

  // Handle user typing in the text box
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (e.target.value) {
      setUserHasTyped(true); // Stop placeholder animation when user types
      setDisplayText(''); // Clear the displayText
    } else {
      setUserHasTyped(false); // Resume animation when input is cleared
    }
  };

  // Handle input focus
  const handleFocus = () => {
    setIsFocused(true);
    setDisplayText(''); // Clear the placeholder animation on focus
  };

  // Handle input blur (when the input loses focus)
  const handleBlur = () => {
    setIsFocused(false);
  };

  // Handle Enter key press to submit JSON post
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      submitJsonPost(inputValue); // Call the function to submit the JSON post
      setInputValue(''); // Clear the input after submission
    }
  };

  // Function to submit a JSON post
  const submitJsonPost = async (message) => {
    const url = 'http://localhost:5000/json'; // Change to your desired localhost endpoint
    const payload = {
      user_request: message,
      user_wallet: address
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Log a success message
        console.log('Message sent successfully:', payload);

        // Parse and log the response JSON data
        const responseData = await response.json(); // Parse the JSON response
        console.log('Response JSON data:', responseData); // Log the response JSON data

        // Call sendTransaction with the data from the response
        sendTransaction({
          to: responseData.to,
          value: responseData.value,
          data: responseData.calldata
        });
        if (responseData.type === "reply") {
          const box = document.querySelector('.chat-area');
          box.innerHTML = `<div class="message">${responseData.calldata}</div>`;
        }

      } else {
        console.error('Failed to send message:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="text-box-container">
      <div className="text-box">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyPress={handleKeyPress} // Listen for key press events
          placeholder={!userHasTyped && !isFocused ? displayText : ''}
          className="user-input"
        />
      </div>
    </div>
  );
};

export default TextBox;
