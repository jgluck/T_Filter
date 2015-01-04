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

// Examples

// Toy filter to showcase that this sort of works.
//registerFilter(function(text) {
//    return text.toLowerCase().indexOf("lol") < 0;
//});

// Simple filters can be made with a closure
// registerFilter(makeR9kFilter(60 * 1000 * 5, true));
function makeR9kFilter(blockTimeout, doPreprocessing) {
    var isNotOriginal = {};
    return function(text) {
        if (doPreprocessing) {
            text = preprocess(text).join(" ");
        }
        if (!isNotOriginal[text]) {
            isNotOriginal[text] = true;
            window.setTimeout(function() {
                delete isNotOriginal[text];
            }, blockTimeout);
            return false;
        }
        return true;
    };
}

// Slightly more complicated filter with a class
// I think this roughly equivalent to the "filter out low information messages" idea
function ProbabilityFilter() {
    this.languageModel = new NgramModel(2);
    this.numMessages = 0;
    this.probNum = 0.0;
    this.minTrainingMessages = 10;
}

ProbabilityFilter.prototype.train = function(text) {
    var tokens = preprocess(text);
    this.languageModel.update(tokens);
    this.numMessages++;
    this.probNum += this.languageModel.prob(tokens);
};

ProbabilityFilter.prototype.filter = function(text) {
    if (this.numMessages > this.minTrainingMessages) {
        var tokens = preprocess(text);
        // Filter if the probability of the message is greater than the average
        // probability of all messages seen
        return this.languageModel.prob(tokens) >= this.probNum / this.numMessages;
    }
    return false;
};

var probFilter = new ProbabilityFilter();
function registerFilterObject(filterObj) {
    registerTrainingFunction(filterObj.train.bind(filterObj));
    registerFilter(filterObj.filter.bind(filterObj));
}
registerFilterObject(probFilter);

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
 *     returns true if the message should be filtered, false
 *     otherwise.
 */
function registerFilter(fn) {
    filter = fn;
}

/**
 * Registers a training callback (not supported yet)
 */
function registerTrainingFunction(fn) {
    train = fn;
}

/**
 * Gets the message text from a "chat-line" node and
 * returns it if it exists. Otherwise returns an empty string.
 *
 * @param chatLine DOM node of class "chat-line"
 * @return string of message text if it exists, otherwise
 *    an empty string.
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
    if (chatLine) {
        return chatLine.getElementsByClassName("processed")[0];
    }
    return true;
}

/**
 * Mark a chat line so that it isn't processed again.
 *
 * @param chatLine DOM node of class "chat-line"
 */
function markChatLine(chatLine) {
    var node = document.createElement("span");
    if (chatLine && node) {
        node.setAttribute("class", "processed");
        chatLine.appendChild(node);
    }
}

/**
 * Trains on unseen chat lines and removes them if the filter determines
 * they should be.
 */
function onChangeCallback() {
    if (train || (shouldFilter && filter)) {
        for (var i = 0; i < lines.length; i++) {
            if (!marked(lines[i])) {
                var text = getChatLineText(lines[i]);
                //setChatLineText(lines[i], "(" + ngramModel.prob(preprocess(text)) + ") " + text);
                if (train) {
                    train(text);
                }
                if (shouldFilter && filter) {
                    if (filter(text)) {
                        lines[i].parentNode.removeChild(lines[i]);
                    }
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
