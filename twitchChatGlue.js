// Some global state... I need to figure out if there is
// a more idiomatic Javascript way to do this.
var INIT_RETRY_PERIOD = 2000;
var chatContainer = null;
var lines = null;
var filter = null;
var train = null;
var shouldFilter = true;
var shouldTrain = true;

init();
var ngramModel = new NgramModel(2);
registerTrainingFunction(function(text) {
    ngramModel.update(preprocess(text));
});

// Toy filter to showcase that this sort of works.
registerFilter(function(text) {
    return false;
	//return text.toLowerCase().indexOf("lol") < 0;
});

/**
 * Set up all of the global state.
 */
function init() {
	// Chat takes a while to load, I'm not  100% it happens before
	// an onLoad callback would get called, and I want to avoid
	// jquery unless we absolutely need it.
	window.setTimeout(function () {
		if (!chatContainer) {
			chatContainer = document.getElementsByClassName("chat-lines")[0];
			lines = document.getElementsByClassName("chat-line");
			if (!chatContainer || !lines) {
				init();
			} else {
				initFiltration();
			}
		}
	}, INIT_RETRY_PERIOD);
}

/**
 * Turn filtration on/off.
 */
function toggleFilter() {
	shouldFilter = !shouldFilter;
}

/**
 * Registers a filter callback. Note: I'm not sure this is
 * the best API to offer you, but it was easy for now.
 *
 * @param fn function that takes text from a message and 
 * 	returns true if the message should be filtered, false
 * 	otherwise.
 */
function registerFilter(fn) {
	filter = fn;
}

/**
 * Registers a training callback (not supported yet)
 */
function registerTrainingFunction(fn) {
    console.log("THIS WAS CALLED");
	train = fn;
}

/**
 * Gets the message text from a "chat-line" node and
 * returns it if it exists. Otherwise returns an empty string.
 *
 * @param chatLine DOM node of class "chat-line"
 * @return string of message text if it exists, otherwise
 *	an empty string.
 */
function getChatLineText(chatLine) {
	var message = chatLine.getElementsByClassName("message")[0];
	if (message && message.textContent) {
		return message.textContent;
	}
	return "";
}

/**
 * Change chat line text. Basically just for debugging.
 *
 * @param chatLine DOM node of class "chat-line"
 */
function setChatLineText(chatLine, string) {
	var message = chatLine.getElementsByClassName("message")[0];
	if (message && message.textContent) {
		message.textContent = string;
	}
}

/**
 * Check if a chat line is marked.
 *
 * @param chatLine DOM node of class "chat-line"
 */
function marked(chatLine) {
    console.log(chatLine);
	return chatLine.getElementsByClassName("processed")[0];
}

/**
 * Mark a chat line so that it isn't processed again.
 *
 * @param chatLine DOM node of class "chat-line"
 */
function markChatLine(chatLine) {
    var node = document.createElement("span");
    node.setAttribute("class", "processed");
    chatLine.appendChild(node);
}

function onChangeCallback() {
    if (shouldFilter && filter) {
        for (var i = 0; i < lines.length; i++) {
            if (!marked(lines[i])) {
                var text = getChatLineText(lines[i]);
                setChatLineText(lines[i], "(" + ngramModel.prob(preprocess(text)) + ") " + text);
                train(text);
                if (filter(text)) {
                    lines[i].parentNode.removeChild(lines[i]);
                }
                markChatLine(lines[i]);
            }
        }
    }
}

/**
 * Potentially filters messages out of Twitch chat whenever
 * one is received.
 */
function initFiltration() {
	var observer = new MutationObserver(onChangeCallback);
	observer.observe(chatContainer, {childList: true});
}

/**
 * Potentially filters messages out of Twitch chat whenever
 * one is received (for legacy browsers). Apparently
 * DOM change event listeners are in the process of being
 * deprecated.
 */
function initFiltrationLegacy() {
	chatContainer.addEventListener("DOMNodeInserted", onChangeCallback);
}
