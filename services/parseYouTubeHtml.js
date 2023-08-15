const jsdom = require("jsdom");
const { JSDOM } = jsdom;

exports.returnVideoLinks = function (domString) {
    const { document } = (new JSDOM(domString)).window;
}
