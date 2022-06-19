function appendToList(child) {
    const chatbox = document.getElementById('chatbox');
    chatbox.appendChild(child);
    chatbox.scrollTop = chatbox.scrollHeight;
}
  
function sendMessage(message) {
    appendToList(createMessage(message));
    ws.send(message);
}
  
function sendTextMessage() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput.value) {
        sendMessage(removeTags(chatInput.value));
        chatInput.value = '';
    }
}

function removeTags(string) {
    return string.replace(/<(?:.|\n)*?>/gm, '');
}
  
function md2html (md) {
    const bold_pattern1 = /\*{2}(.+)\*{2}/gim; // <b>
    const bold_pattern2 = /\_{2}(.+)\_{2}/gim;  // <b>
    const italic_pattern1 = /\_(.+)\_/gim; // <i>
    const italic_pattern2 = /\*(.+)\*/gim; // <i>
    const striketrough_pattern = /\~{2}(.+)\~{2}/gim; // <del>
    const a_pattern1 = /\[(.+)\]\((.+)\)/gim; // <a>
    const a_pattern2 = /\[(.+)\]\((.+) \"(.+)\"\)/gim; // <a>
    const a_pattern3 = /\[(.+)\]/gim; // <a>
  
    /* links */
    md = md.replace(a_pattern1, function(match, title, url) {
      return '<a href="' + url + '">' + title + '</a>';
    })
    md = md.replace(a_pattern2, function(match, title, url, tooltip) {
      return '<a href="' + url + '" title="' + tooltip + '">' + title + '</a>';
    })
    md = md.replace(a_pattern3, function(match, url) {
      return '<a href="' + url + '">' + url + '</a>';
    })
  
    /* bold */
    md = md.replace(bold_pattern1, function(match, str) {
      return '<b>' + str + '</b>';
    })
    md = md.replace(bold_pattern2, function(match, str) {
      return '<b>' + str + '</b>';
    })
  
    /* italic */
    md = md.replace(italic_pattern1, function(match, str) {
      return '<i>' + str + '</i>';
    })
    md = md.replace(italic_pattern2, function(match, str) {
      return '<i>' + str + '</i>';
    })
  
    /* striketrough */
    md = md.replace(striketrough_pattern, function(match, str) {
      return '<del>' + str + '</del>';
    })
  
    return md;
}
  
function createMessage (content) {
    const item = document.createElement('li');
    item.innerHTML = md2html(content);
  
    return item;
}

var incomingMessages = [],
scheduled,
prefix = '';

if (window.getSubdomain() !== 'localhost') {
    prefix = window.getSubdomain() + '_';
}
var protocol = prefix + window.location.pathname.replace(/\//g, '_');
var ws = new WebSocket('wss://chat.shoogle.net/',  protocol);
ws.onmessage = function(message) {
    incomingMessages.push(createMessage(message.data));

    if (!scheduled) {
        scheduled = true;
        window.requestAnimationFrame(function() {
            const frag = document.createDocumentFragment();
            for (let i = 0, len = incomingMessages.length; i < len; i++) {
                frag.appendChild(incomingMessages[i]);
            }
            appendToList(frag);
            incomingMessages.length = 0;
            scheduled = false;
        })
    }
}

document.getElementById('chat-btn').onclick = function() {
    sendTextMessage();
};

document.getElementById('chat-form').onkeypress = function(event) {
    if (event.keyCode === 13) {
    event.preventDefault();
    sendTextMessage();
    }
};

var emojiButton = document.getElementById('emoji-btn');
emojiButton.onclick = function() {
    window.loadScript('emoji.js');

    // Remove reference (and handler)
    emojiButton = null;
}
