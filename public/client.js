// CollabNote is a minimalistic collaborative markdown text editor
// License: AGPL v3, https://www.gnu.org/licenses/agpl-3.0.txt
// Copyright (C) 2016 Alexander Barth, https://github.com/Alexander-Barth

"use strict";

var socket = null;

// DOM element with the text
var doc;
// previous text
var oldtext;
// id of the user/client
var userid;

// id of the document
var docid;

// increment for every change
var tag = 0;

// all applied changes
var applied_changes = [];

// local changes, not necessarily applied everywhere
var local_changes = {};


function isEqual(arr1, arr2) {
    return JSON.stringify(arr1) === JSON.stringify(arr2);
}

function copy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// difference of setA and setB
// all elements in setA, but not in setB
function diffset(setA, setB) {
    return setA.filter(function(_) { return setB.indexOf(_) === -1; });
}

// apply a single change to oldtext
// keep track of all changes and update applied_changes
// return new text, or null of the change cannot be applied

function apply_single_change(oldtext,change,applied_changes) {
    var newtext = oldtext;

    // check if change can be applied
    if (!isEqual(applied_changes,change.base)) {
        // no
        return null;
    }

    if (change.del !== undefined) {
        newtext = newtext.substring(0,change.del.start) + newtext.substring(change.del.start+change.del.n);
    }

    if (change.add !== undefined) {
        newtext = newtext.substring(0,change.add.start) + change.add.data + newtext.substring(change.add.start);
    }

    // keep track of applied changes
    applied_changes.push(change.id);
    applied_changes.sort();

    return newtext;
}

// rebase change2 so that it can be applied after change1

function rebase(change1,change2) {
    var n;

   if (change1.del) {
       // amount of text that has been deleted
       n = change1.del.n;

       if (change2.add && change1.del.start <= change2.add.start) {
              if (change1.del.start + n < change2.add.start) {
                  // some text has been remove so advance the start index
                  change2.add.start -= n;
              }
              else {
                  // oh, no, change1 remove a pice of text where change2 added text
                  // add the text at the removed location
                  console.log("trouble");
                  change2.add.start =  change1.del.start;
              }
       }

       if (change2.del && change1.del.start <= change2.del.start) {
              // some text has been remove so advance the start index
              change2.del.start -= n;
       }
   }

   if (change1.add) {
       // amount of text that has been add
       n = change1.add.data.length;

       if (change2.add && change1.add.start <= change2.add.start) {
              // some text has been added ahead so increase the start index
              change2.add.start += n;
       }

       if (change2.del && change1.add.start <= change2.del.start) {
              // some text has been added ahead so inclear the start index
              change2.del.start += n;
       }
   }


   change2.base.push(change1.id);
   change2.base.sort();
}

// apply a list of changes
function merge(oldtext,allchanges,applied_changes) {
    var i, j, k;
    var newtext = oldtext;
    var changes = copy(allchanges);

    while (changes.length > 0) {
        k = null;

        // look for the earliest change applied to version "applied_changes"
        for (i = 0; i < changes.length; i+=1) {
            if (isEqual(changes[i].base,applied_changes)) {
                if (k === null) {
                    k = i;
                }
                else if (changes[i].time < changes[k].time) {
                    k = i;
                }
            }
        }

        if (k !== null) {
            newtext = apply_single_change(oldtext,changes[k],applied_changes);
            oldtext = newtext;

            // rebase all other patches with the same base
            for (j = 0; j < changes.length; j+=1) {
                if (isEqual(changes[k].base,changes[j].base) && k !== j) {
                    // rebase changes[j]
                    rebase(changes[k],changes[j]);
                }

            }

            // remove current change from the list
            changes.splice(k,1);
        }
        else {
            console.log("cannot apply all changes");
            break;
        }
    }

    return newtext;
}


function render() {
    // render buffer as markdown
    document.getElementById("rendered").innerHTML =
        marked(doc.value);

    MathJax.Hub.Queue(["Typeset",MathJax.Hub,"MathExample"]);
}

function set_document(text) {
    doc.value = text;
    render();
}

function compare(oldtext,text) {
    var i, j;
    var founddiff = false;
    var cmd = {time: Date.now()};

    if (oldtext === text) {
        return null;
    }

    // i start index
    // j end index (counted from the end)
    for (i = 0; i < Math.max(oldtext.length,text.length); i+=1) {
        if (oldtext[i] !== text[i]) {
            for (j = 0; j < Math.max(oldtext.length,text.length); j+=1) {

                // we always need i <= (old)text.length-j

                if (oldtext[oldtext.length-1-j] !== text[text.length-1-j] || i == oldtext.length-j || i == text.length-j) {
                    // part deleted

                    if (i !== oldtext.length-j) {
                        cmd.del = {start: i, n: oldtext.length-j-i};
                        //console.log("delete",i,oldtext.substring(i,oldtext.length-j));
                    }
                    // added

                    if (i !== text.length-j) {
                        cmd.add = {start: i, data: text.substring(i,text.length-j)};
                        //console.log("added",i,text.substring(i,text.length-j));
                    }

                    return cmd;

                }
            }
        }
    }
}


function update(ev) {
    var cmd;
    //console.log(doc.value,ev);
    render();

    cmd = compare(oldtext,doc.value);

    if (cmd !== null) {
        // there is a change
        oldtext = doc.value;

        // every change gets an unique id
        cmd.id = userid + ":" + tag;
        cmd.base = copy(applied_changes);
        tag = tag+1;

        // update change list
        applied_changes.push(cmd.id);
        applied_changes.sort();

        // keep track of local changed
        local_changes[cmd.id] = cmd;

        // send to server
        socket.send(JSON.stringify({"command": "edit", "diff": [cmd]}));
    }
}



function parse_query_string() {
    // http://stackoverflow.com/a/3855394
    return (function(a) {
        var i, p;
        var b = {};

        if (a === "") {
            return {};
        }

        for (i = 0; i < a.length; i+=1)
        {
            p = a[i].split("=", 2);
            if (p.length === 1) {
                b[p[0]] = "";
            }
            else {
                b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
            }
        }
        return b;
    })(window.location.search.substr(1).split("&"));

}

function encode_query_string(param) {
    var name;
    var parameters = "";

    for (name in param) {
        parameters += (parameters.length !==0 ? "&" : "") + encodeURIComponent(name) + "=" + encodeURIComponent(param[name]);
    }

    return parameters;
}

function init() {
    var qs = parse_query_string();
    console.log("qs",qs);

    if (qs["userid"] === undefined) {
        userid = Math.round(Math.random() * 1e3);
    }
    else {
        userid = qs["userid"];
    }

    if (qs["docid"] === undefined) {
        // random id, must be unique for a document
        qs["docid"] = Math.round(Math.random() * 1e8);
        var newURL = window.location.protocol + "//" + window.location.host + window.location.pathname + "?" + encode_query_string(qs);
        window.location.href = newURL;
    }

    docid = qs["docid"];

    // start with empty document
    doc = document.getElementById("doc");
    doc.value = "";
    oldtext = doc.value;
    doc.onchange = update;
    doc.onkeyup = update;

    // initialize mathjax
    MathJax.Hub.Config({
        tex2jax: {inlineMath: [["$","$"], ["\\(","\\)"]]}
    });

    // open socked
    socket = new WebSocket("ws://" + window.location.hostname + ":8000");

    socket.onopen = function() {
        console.log("Connected!");
        socket.send(JSON.stringify({"docid": docid, "userid": userid, "command": "subscribe"}));
    }

    socket.onmessage = function(e) {
        if (typeof e.data !== "string") {
            console.error("Binary message received");
        }

        var cmds = JSON.parse(e.data);

        if (cmds["command"] == "edit") {
            // apply all changes to the document
            var text = doc.value;
            text = merge(text,cmds.diff,applied_changes);
            set_document(text);
            oldtext = text;
        }
    }

    socket.onclose = function(e) {
        console.log("Connection closed.");
        alert("Connection closed.");
        socket = null;
    }

    test();
};

