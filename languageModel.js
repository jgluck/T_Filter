/**
 * Grab bag of useful NLP stuff.
 * Should probably be reorganized and split up.
 */

/**
 * Dictionary class that returns a default value when no mapping exists for
 * a key.
 *
 * @param getDefault function that takes no parameters and returns a default
 *  value.
 */
function DefaultDict(getDefault) {
    this.getDefault = getDefault;
    this.dict = {};
}

/**
 * Puts a value in the DefaultDict.
 *
 * @param k key
 * @param v value
 */
DefaultDict.prototype.put = function(k, v) {
    this.dict[k] = v;
};

/**
 * Gets a value in the DefaultDict.
 *
 * @param k key
 * @return value k maps to or default value if no mapping exists.
 */
DefaultDict.prototype.get = function(k) {
    var val = this.dict[k];
    return val ? val : this.getDefault();
};

/**
 * Returns the underlying object to iterate over keys.
 *
 * @return a key iterator
 */
DefaultDict.prototype.iter = function() {
    return this.dict;
};

/**
 * Returns the number of keys
 *
 * @return number of keys
 */
DefaultDict.prototype.size = function() {
    return Object.keys(this.dict).length;
};

/**
 * Multinomial probability distribution class.
 *
 * @param smoothFactor number to add to count of each outcome.
 */
function SmoothedProbDist(smoothFactor) {
    this.smooth = smoothFactor || 0.0;
    this.counts = new DefaultDict(function() {
        return this.smooth;
    }.bind(this));
    this.total = 0.0;
}

/**
 * Increment the count of an outcome.
 * 
 * @param outcome outcome to increment
 */
SmoothedProbDist.prototype.inc = function(outcome) {
    this.counts.put(outcome, this.counts.get(outcome) + 1.0);
    this.total++;
};

/**
 * Conpute and return probability numerator of a outcome.
 *
 * @param outcome outcome to get numerator for
 * @return probability numerator for outcome
 */
SmoothedProbDist.prototype.probNum = function(outcome) {
    return this.counts.get(outcome);
};

/**
 * Compute and return probability denominator for this distribution.
 *
 * @return probability denominator for this distribution
 */
SmoothedProbDist.prototype.probDenom = function() {
    return this.total + (this.counts.size() + 1.0) * this.smooth;
};

/**
 * Compute and return probability of a outcome.
 *
 * @param outcome outcome to compute probability of
 * @return probability of outcome.
 */
SmoothedProbDist.prototype.prob = function(outcome) {
    return Math.exp(this.logProb(outcome));
};

/**
 * Compute and return the log probability of a outcome.
 *
 * @param outcome outcome to compute log probability of
 * @return log probability of outcome.
 */
SmoothedProbDist.prototype.logProb = function(outcome) {
    return Math.log(this.probNum(outcome)) - Math.log(this.probDenom());
}

/**
 * Return size of sample space.
 *
 * @return size of sample space.
 */
SmoothedProbDist.prototype.size = function() {
    return this.counts.size();
};

/**
 * Smoothed conditional probability distribution class.
 *
 * @param smoothFactor number to add to count of each outcome.
 */
function CondSmoothedProbDist(smoothFactor) {
    this.smooth = smoothFactor;
    this.condProbDists = new DefaultDict(function () {
        return new SmoothedProbDist(this.smooth);
    }.bind(this));
}

/**
 * Increment the count of outcome in the presence of context.
 *
 * @param context thing to condition on
 * @param outcome type of outcome
 */
CondSmoothedProbDist.prototype.inc = function(context, outcome) {
    var probDist = this.condProbDists.get(context);
    probDist.inc(outcome);
    this.condProbDists.put(context, probDist);
};

/**
 * Computes and returns probability of outcome conditioned on context.
 *
 * @param context thing to condition on
 * @param outcome outcome to get probability of
 * @return P(outcome|context)
 */
CondSmoothedProbDist.prototype.condProb = function(context, outcome) {
    return this.condProbDists.get(context).prob(outcome);
};

/**
 * Computes and returns log probability of outcome conditioned on context.
 *
 * @param context thing to condition on
 * @param outcome outcome to get probability of
 * @return log(P(outcome|context))
 */
CondSmoothedProbDist.prototype.logCondProb = function(context, outcome) {
    return this.condProbDists.get(context).logProb(outcome);
}

/**
 * Computes and returns probability of outcome.
 *
 * @param outcome outcome to get probability of
 * @return P(outcome)
 */
CondSmoothedProbDist.prototype.prob = function(outcome) {
    var num = 0.0;
    var denom = 0.0;
    for (var key in this.condProbDists.iter()) {
        num += this.condProbDists.get(key).probNum(outcome);
        denom += this.condProbDists.get(key).probDenom();
    }
    if (denom == 0.0) {
        return 1.0;
    }
    return num / denom;
};

/**
 * Computes and returns probability of outcome.
 *
 * @param outcome outcome to get probability of
 * @return log(P(outcome))
 */
CondSmoothedProbDist.prototype.logProb = function(outcome) {
    return Math.log(this.prob(outcome));
}

/**
 * Zips 2+ arrays together a la Python zip.
 *
 * Example:
 *  zip([1, 2, 3], [4, 5, 6, 7]) =
 *      [[1, 4], [2, 5], [3, 6]]
 * 
 * @param arguments a variable number of arrays
 * @return zipped array the same size as the smallest input array.
 */
function zip() {
    if (arguments.length < 2) {
        return [];
    }
    var minLen = arguments[0].length;
    for (var i = 1; i < arguments.length; i++) {
        var len = arguments[i].length;
        if (len < minLen) {
            minLen = len;
        }
    }
    var result = [];
    for (var i = 0; i < minLen; i++) {
        var tmp = [];
        for (var j = 0; j < arguments.length; j++) {
            tmp.push(arguments[j][i]);
        }
        result.push(tmp);
    }
    return result;
}

/**
 * Makes ngrams of order n given an array of words.
 *
 * @param words list of strings
 * @param n order of ngrams to create (e.g., 2 for bigrams)
 * @return list of ngrams.
 */
function makeNgrams(words, n) {
    var tokens = ["^"];
    tokens.push.apply(tokens, words);
    tokens.push("$");
    var tmp = [];
    for (var i = 0; i < n; i++) {
        tmp.push(tokens.slice(i, tokens.length));
    }
    return zip.apply(this, tmp);
}

/**
 * Returns context of a ngram (every word before the last).
 *
 * @return single string of every word before the last one.
 */
function ngramContext(ngram) {
    return ngram.slice(0, ngram.length - 1).join(" ");
}

/**
 * Returns the last word in an ngram.
 *
 * @param ngram
 * @return last word in ngram
 */
function ngramLast(ngram) {
    return ngram[ngram.length - 1];
}

/**
 * Ngram language model class.
 *
 * @param n order of ngrams (e.g., 2 for bigrams)
 */
function NgramModel(n) {
    this.n = n;
    this.condProbDist = new CondSmoothedProbDist(1.0);
}

/**
 * Updates model from a list of words in order.
 *
 * @param words ordered array of words.
 */
NgramModel.prototype.update = function(words) {
    var ngrams = makeNgrams(words, this.n);
    for (var i = 0; i < ngrams.length; i++) {
        var context = ngramContext(ngrams[i]);
        this.condProbDist.inc(context, ngramLast(ngrams[i]));
    }
};

/**
 * Computes and returns log probability of a sequence of words.
 *
 * @param words ordered array or words to compute log probability of
 * @return log probability of words
 */
NgramModel.prototype.logProb = function(words) {
    var ngrams = makeNgrams(words, this.n);
    var prob = 0.0;
    for (var i = 0; i < ngrams.length; i++) {
        var context = ngramContext(ngrams[i]);
        prob += this.condProbDist.logProb(context, ngramLast(ngrams[i]));
    }
    return prob;
};

/**
 * Computes and returns probability of a sequence of words.
 *
 * @param words ordered array or words to compute probability of
 * @return probability of words
 */

NgramModel.prototype.prob = function(words) {
    return Math.exp(this.logProb(words));
}

/**
 * Tokenize a string.
 *
 * @param string string to tokenize.
 * @return array or tokens
 */
function tokenize(string) {
    return string.split(/\s+/);
}

/**
 * Preprocess a string.
 *
 * @param string string to preprocess
 * @return array or preprocessed tokens
 */
function preprocess(string) {
    var PUNCTUATION = /[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g;
    string = string.toLowerCase();
    string = string.replace(PUNCTUATION, "");
    tokens = tokenize(string);
    return tokens;
}
