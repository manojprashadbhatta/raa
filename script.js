let localConnection;
let remoteConnection;
let dataChannel;

const broButton = document.getElementById("bro-button");
const raaButton = document.getElementById("raa-button");
const connectButton = document.getElementById("connect-button");
const sendButton = document.getElementById("send-button");
const messageInput = document.getElementById("message-input");
const chatBox = document.getElementById("chat-box");
const codeOutput = document.getElementById("code-output");
const codeInput = document.getElementById("code-input");
const statusIndicator = document.getElementById("status-indicator");

// Basic function to add messages to the chat
function addMessage(who, msg) {
    const p = document.createElement("p");
    p.innerHTML = `<strong>${who}:</strong> ${msg}`;
    chatBox.appendChild(p);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Set connection dot color
function updateStatus(color) {
    statusIndicator.style.backgroundColor = color;
}

// When Bro clicks the button, he becomes the offerer
broButton.onclick = async () => {
    updateStatus("red");
    localConnection = new RTCPeerConnection();

    dataChannel = localConnection.createDataChannel("chat");
    setupChannel(dataChannel);

    const offer = await localConnection.createOffer();
    await localConnection.setLocalDescription(offer);

    // Wait for ICE gathering
    await waitForIceGathering(localConnection);
    const offerString = btoa(JSON.stringify(localConnection.localDescription));
    codeOutput.value = offerString;

    localConnection.oniceconnectionstatechange = () => {
        if (localConnection.iceConnectionState === "connected") {
            updateStatus("green");
        }
    };
};

// When Raa clicks the button, she pastes Bro's code and connects
connectButton.onclick = async () => {
    updateStatus("red");
    const offer = JSON.parse(atob(codeInput.value));
    localConnection = new RTCPeerConnection();

    localConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupChannel(dataChannel);
    };

    await localConnection.setRemoteDescription(offer);
    const answer = await localConnection.createAnswer();
    await localConnection.setLocalDescription(answer);

    // Wait for ICE gathering
    await waitForIceGathering(localConnection);
    const answerString = btoa(JSON.stringify(localConnection.localDescription));
    codeOutput.value = answerString;

    localConnection.oniceconnectionstatechange = () => {
        if (localConnection.iceConnectionState === "connected") {
            updateStatus("green");
        }
    };
};

// Bro pastes Raa's answer to complete the connection
raaButton.onclick = async () => {
    const answer = JSON.parse(atob(codeInput.value));
    await localConnection.setRemoteDescription(answer);
};

// Send chat message
sendButton.onclick = () => {
    const message = messageInput.value.trim();
    if (message && dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(message);
        addMessage("Bro", message);
        messageInput.value = "";
    }
};

// Setup data channel events
function setupChannel(channel) {
    channel.onopen = () => updateStatus("green");
    channel.onclose = () => updateStatus("red");
    channel.onmessage = (event) => {
        addMessage("Raa", event.data);
    };
}

// Wait for ICE candidates to be fully gathered
function waitForIceGathering(pc) {
    return new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") {
            resolve();
        } else {
            function checkState() {
                if (pc.iceGatheringState === "complete") {
                    pc.removeEventListener("icegatheringstatechange", checkState);
                    resolve();
                }
            }
            pc.addEventListener("icegatheringstatechange", checkState);
        }
    });
}
