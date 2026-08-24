// Teacher highlights text with the mouse and chooses a color 
// Teacher writes inline comments inside the comment box and saves it
// Inline comments are appended in red color to the end of the highlighted text
// Inline comments can be edited or deleted 
// - Highlighted text
// - Inline comment
// - Comment box 

let colors = ["none", "yellow", "green", "blue", "purple", "red", "pink", "orange", "strikethrough"];
let icons = {
    'minus': 'Dash mark',
    'check': 'Check mark',
    'times': 'Cross mark',
    'question': 'Question mark',
    'exclamation': 'Exclamation mark',
    'thumbs-up': 'Thumbs up',
    'thumbs-down': 'Thumbs down'
};
let currentColor = 'yellow';
let currentIcon = 'minus';
let previousColor = null;
let previousIcon = null;
let commentBox = null;
let stdAnswerHTML = null;
let hasErrors = null;
let commentBoxWidth = 375;

function initCommentListener(event) {
        unwrapCurrentHighlightedText();
        removeCommentBox();

        var spanId = ID();
        var spanElement = document.createElement('span');
        spanElement.className = 'inline-hl ' + currentColor;
        spanElement.dataset.comment = spanId;
        spanElement.dataset.color = currentColor;
        spanElement.dataset.icon = currentIcon;
        spanElement.dataset.status = 'current';

        var sel = window.getSelection();

        // Prevent single-click empty text selection
        if (sel.toString().length < 1) {
            return false;
        }

        var ranges = [];
        var range;
        for (var i = 0, len = sel.rangeCount; i < len; ++i) {
            ranges.push(sel.getRangeAt(i));
        }
        sel.removeAllRanges();

        // Surround ranges in reverse document order to prevent surrounding subsequent 
        // ranges messing with already-surrounded ones
        i = ranges.length;
        while (i--) {
            range = ranges[i];
            surroundRangeContents(range, spanElement);
            sel.addRange(range);
        }

        clearSelection();

        // Check for unpermitted highlight actions
        var errors = checkHighlightErrors(spanId);

        if (errors) {
            hasErrors = true;
            unwrapCurrentHighlightedText();
            alert(errors);
            return false;
        }

        // Place comment box in HTML body
        setCommentBoxPosition(event);
        disableEventsOnModalWrittenTaskReport();
        addDataToCommentBox(spanId);
}

function initInlineCommentBox(container) {
    commentBox = document.createElement('div');
    commentBox.className = 'inline-comment-box float-menu';

    $(commentBox).html([
        '<div class="picker-container">',
            '<div style="position: relative; margin-right: 5px;">',
                '<a class="btn btn-small dropdown-toggle change-color" role="button" data-toggle="dropdown">',
                    '<i class="fa fa-square-o preview"></i> Style',
                    '<b class="caret" style="margin-left: 2px;"></b>',
                '</a>',
                '<div class="dropdown-menu colorpicker" role="menu"></div>',
            '</div>',
            '<div style="position: relative;">',
                '<a class="btn btn-small dropdown-toggle change-icon" role="button" data-toggle="dropdown">',
                    '<i class="fa fa-minus preview"></i> Icon',
                    '<b class="caret" style="margin-left: 2px;"></b>',
                '</a>',
                '<div class="dropdown-menu iconpicker" role="menu"></div>',
            '</div>',
        '</div>',
        '<div id="errors"></div>',
        '<textarea style="height: 70px;"></textarea>',
        '<div class="row-fluid" style="margin-top: 5px; text-align: right;">',
            '<button class="btn btn-small btn-link destroy-comment">',
                '<i class="fa fa-trash"></i> Delete',
            '</button>',
            '<button class="btn btn-small btn-info add-comment">OK</button>',
            '<button class="btn btn-small btn-link cancel">Cancel</button>',
        '</div>'
    ].join(""));

    // Add highlight colors + strikethrough
    $.each(colors, function (i, color) {
        var colorBtn = document.createElement('button');

        var lastBtn = i == colors.length - 1;
        var mr5 = lastBtn ? '' : 'mr-5';

        colorBtn.className = `btn btn-default color ${mr5} ${color}`;
        colorBtn.dataset.color = color;
        colorBtn.title = color.charAt(0).toUpperCase() + color.slice(1);

        if (color == 'strikethrough') {
            $(colorBtn).html('<i class="fa fa-strikethrough" data-color="strikethrough"></i>');
        }

        $(commentBox).find('.colorpicker').append(colorBtn);
    });

    // Add icons
    var faIcons = Object.keys(icons);
    faIcons.forEach(function (faIcon, i) {
        var lastBtn = i == faIcons.length - 1;
        var mr5 = lastBtn ? '' : 'mr-5';

        var color = '';
        if ($.inArray(faIcon, ["minus", "times", "question", "exclamation"]) >= 0) {
            color = 'red';
        }
        if (faIcon == "check") {
            color = 'green';
        }
        if (faIcon == 'thumbs-up' || faIcon == 'thumbs-down') {
            color = 'blue';
        }

        var iconBtn = document.createElement('button');
        iconBtn.className = `btn btn-default icon ${mr5}`;
        iconBtn.dataset.icon = faIcon;
        iconBtn.title = icons[faIcon];

        $(iconBtn).html(`<i class="fa fa-${faIcon} ${color}" data-icon="${faIcon}"></i>`);

        $(commentBox).find('.iconpicker').append(iconBtn);
    });

    $(commentBox).find('#errors').html("");

    // Bind events
    $(commentBox).find('button.add-comment').attr('onclick', 'addComment(event)');
    $(commentBox).find('button.destroy-comment').attr('onclick', 'destroyComment(event)');
    $(commentBox).find('button.cancel').attr('onclick', 'cancel()');
    $(commentBox).find('button.color').attr('onclick', 'changeColor(event)');
    $(commentBox).find('button.icon').attr('onclick', 'changeIcon(event)');

    stdAnswerHTML = container;

    initEditCommentListener();
}

/*********************************************** HIGHLIGHT FUNCTIONS **************************************************/

function getNextNode(node) {
    var next = node.firstChild;
    if (next) {
        return next;
    }
    while (node) {
        if ((next = node.nextSibling)) {
            return next;
        }
        node = node.parentNode;
    }
}

function getNodesInRange(range) {
    var start = range.startContainer;
    var end = range.endContainer;
    var commonAncestor = range.commonAncestorContainer;
    var nodes = [];
    var node;

    // Walk parent nodes from start to common ancestor
    for (node = start.parentNode; node; node = node.parentNode) {
        nodes.push(node);
        if (node == commonAncestor) {
            break;
        }
    }
    nodes.reverse();

    // Walk children and siblings from start until end is found
    for (node = start; node; node = getNextNode(node)) {
        nodes.push(node);
        if (node == end) {
            break;
        }
    }

    return nodes;
}

function getNodeIndex(node) {
    var i = 0;
    while ((node = node.previousSibling)) {
        ++i;
    }
    return i;
}

function insertAfter(node, precedingNode) {
    var nextNode = precedingNode.nextSibling,
        parent = precedingNode.parentNode;
    if (nextNode) {
        parent.insertBefore(node, nextNode);
    } else {
        parent.appendChild(node);
    }
    return node;
}

// Note that we cannot use splitText() because it is bugridden in IE 9.
function splitDataNode(node, index) {
    var newNode = node.cloneNode(false);
    newNode.deleteData(0, index);
    node.deleteData(index, node.length - index);
    insertAfter(newNode, node);
    return newNode;
}

function isCharacterDataNode(node) {
    var t = node.nodeType;
    return t == 3 || t == 4 || t == 8; // Text, CDataSection or Comment
}

function splitRangeBoundaries(range) {
    var sc = range.startContainer,
        so = range.startOffset,
        ec = range.endContainer,
        eo = range.endOffset;
    var startEndSame = (sc === ec);

    // Split the end boundary if necessary
    if (isCharacterDataNode(ec) && eo > 0 && eo < ec.length) {
        splitDataNode(ec, eo);
    }

    // Split the start boundary if necessary
    if (isCharacterDataNode(sc) && so > 0 && so < sc.length) {
        sc = splitDataNode(sc, so);
        if (startEndSame) {
            eo -= so;
            ec = sc;
        } else if (ec == sc.parentNode && eo >= getNodeIndex(sc)) {
            ++eo;
        }
        so = 0;
    }
    range.setStart(sc, so);
    range.setEnd(ec, eo);
}

function getTextNodesInRange(range) {
    var textNodes = [];
    var nodes = getNodesInRange(range);
    for (var i = 0, node, el; node = nodes[i++];) {
        if (node.nodeType == 3) {
            textNodes.push(node);
        }
    }
    return textNodes;
}

function surroundRangeContents(range, templateElement) {
    splitRangeBoundaries(range);
    var textNodes = getTextNodesInRange(range);
    if (textNodes.length == 0) {
        return;
    }
    for (var i = 0, node, el; node = textNodes[i++];) {
        if (node.nodeType == 3) {
            el = templateElement.cloneNode(false);
            node.parentNode.insertBefore(el, node);
            el.appendChild(node);
        }
    }
    range.setStart(textNodes[0], 0);
    var lastTextNode = textNodes[textNodes.length - 1];
    range.setEnd(lastTextNode, lastTextNode.length);
}

function clearSelection() {
    if (document.selection && document.selection.empty) {
        document.selection.empty();
    } else if (window.getSelection) {
        var sel = window.getSelection();
        sel.removeAllRanges();
    }
}

/**********************************************************************************************************************/

function removeCommentBox() {
    var box = $('body').find('.inline-comment-box');
    if (box.length) {
        var spanId = box.data('span-id');
        var highlight = stdAnswerHTML.find('span.inline-hl[data-comment="' + spanId + '"]');

        if (previousColor) {
            highlight
                .removeClass(colors.join(" "))
                .addClass(previousColor);

            highlight
                .attr('data-color', previousColor)
                .data('color', previousColor);

            previousColor = null;
        }

        if (previousIcon) {
            highlight
                .removeClass(Object.keys(icons).map(function (icon) {
                    return icon
                }).join(" "))
                .addClass(previousIcon);

            highlight
                .attr('data-icon', previousIcon)
                .data('icon', previousIcon);

            var comment = stdAnswerHTML.find('span.inline-cm[data-comment="' + spanId + '"]');
            if (comment.length) {
                comment
                    .removeClass(Object.keys(icons).map(function (icon) {
                        return icon
                    }).join(" "))
                    .addClass(previousIcon);
            }

            previousIcon = null;
        }

        box.find('#errors').html("");
        box.remove();
        enableEventsOnModalWrittenTaskReport();
    }
}

/**
 * Remove teacher inline comment
 * @param {*} id The comment id
 */
function removeInlineComment(id) {
    stdAnswerHTML.find('span.inline-cm[data-comment="' + id + '"]').remove();
}

/**
 * Create a new comment or edit an existing one
 * @param {*} e Event target 
 */
function addComment(e) {
    var el = e.target || e.srcElement;
    var box = $(el).closest('.inline-comment-box');
    var spanId = box.data('span-id');
    var comment = box.find('textarea').val().trim();

    // EDIT
    if (stdAnswerHTML.find('span.inline-cm[data-comment="' + spanId + '"]').length) {
        stdAnswerHTML.find('span.inline-cm[data-comment="' + spanId + '"]')
            .html(comment2html(comment));
    }
    // CREATE NEW
    else {
        var currentSpan = $('span.inline-hl[data-comment="' + spanId + '"]');
        currentSpan
            .attr('data-status', 'saved')
            .data('status', 'saved');

        currentSpan.last().after([
            '<span class="inline-cm ' + currentIcon + '" data-comment="' + spanId + '">',
            comment2html(comment),
            '</span>',
        ].join(""));
    }

    // Show comments toggler
    if ($('#modal-write-details').find('#toggle-inline-comments').is(":empty")) {
        showInlineCommentsToggler();
    }

    saveSendInlineComment();
}

/**
 * Dismiss current comment box 
 */
function cancel() {
    unwrapCurrentHighlightedText();
    removeCommentBox();
}

/**
 * Unwrap and normalize current (unsaved) highlighted text
 */
function unwrapCurrentHighlightedText() {
    $('#modal-write-details')
        .find('span[data-status="current"]')
        .contents()
        .unwrap();

    // Normalize html
    stdAnswerHTML.find('p').each(function () {
        this.normalize();
    });
}

/**
 * Unwrap all saved comment(s)
 * @param {*} id: the comment id to unwrap
 */
function unwrapComment(id) {
    stdAnswerHTML
        .find('span.inline-hl[data-comment="' + id + '"]') // [data-status="saved"]
        .contents()
        .unwrap();

    // Normalize html
    stdAnswerHTML.find('p').each(function () {
        this.normalize();
    });
}

/**
 * Open comment box to edit inline comment
 */
function initEditCommentListener() {
    stdAnswerHTML.on('click', '.inline-hl, .inline-cm', function (e) {
        e.preventDefault();

        if (hasErrors) {
            return false;
        }

        var spanId = $(this).data('comment');
        var highlightSpan = stdAnswerHTML.find('span.inline-hl[data-comment="' + spanId + '"]');

        // Current color must match the span id color
        var spanColor = highlightSpan.data('color');
        var spanIcon = highlightSpan.data('icon');
        currentColor = spanColor;
        currentIcon = spanIcon;

        setCommentBoxPosition(e);
        disableEventsOnModalWrittenTaskReport();

        if (typeof stdAnswerHTML.find('span.inline-cm[data-comment="' + spanId + '"]').html() !== "undefined") {
            var comment = stdAnswerHTML.find('span.inline-cm[data-comment="' + spanId + '"]').html().trim();
            comment = html2comment(comment);
            addDataToCommentBox(spanId, comment, false);
        }
    });
}

/**
 * Unwrap highlight, remove comment and clear comment box
 * @param {*} e Event target
 */
function destroyComment(e) {
    var el = e.target || e.srcElement;
    var spanId = $(el).closest('.inline-comment-box').data('span-id');

    $.when(
        unwrapComment(spanId),
        removeInlineComment(spanId),
        removeCommentBox(),
    ).then(
        saveSendInlineComment()
    );
}

/**
 * Load comment box with needed dynamic data
 * @param {Number} id The comment id
 * @param {String} comment The comment text
 */
function addDataToCommentBox(id, comment = "", isNewComment = true) {
    $(commentBox)
        .attr('data-span-id', id)
        .data('span-id', id);

    $(commentBox).find('button.destroy-comment').toggle(!isNewComment);

    // Load color info
    var previewColor = $(commentBox).find('.change-color i.preview');
    previewColor.toggleClass('fa-strikethrough', currentColor == 'strikethrough');
    previewColor.toggleClass('fa-square-o', currentColor != 'strikethrough');
    previewColor
        .removeClass(colors.join(" "))
        .addClass(currentColor);

    $(commentBox).find('a.change-color')
        .attr('data-current-color', currentColor)
        .data('current-color', currentColor);

    // Load icon info
    var previewIcon = $(commentBox).find('.change-icon i.preview');
    previewIcon
        .removeClass(Object.keys(icons).map(function (icon) {
            return `fa-${icon}`
        }).join(" "))
        .addClass(`fa-${currentIcon}`); // comment != "" ? `fa-${currentIcon}` : 'fa-minus'

    $(commentBox).find('a.change-icon')
        .attr('data-current-icon', currentIcon)
        .data('current-icon', currentIcon);

    $(commentBox).find('textarea').val(comment);

    if (isNewComment) {
        resetCommentBox(id);
    }

    $.when(
        $('body').append($(commentBox))
    ).then(
        resizeCommentTextarea(),
    );
}

/**
 * Toggle inline comments visibility
 * @param {} element 
 */
function initTurnOnOffComments(element) {
    var toggleInlineComments = element.find('#toggle-inline-comments');
    toggleInlineComments
        .attr('data-toggled', 'on')
        .data('toggled', 'on');

    toggleInlineComments.on('click', '.toggle', function (e) {
        e.preventDefault();

        unwrapCurrentHighlightedText();
        removeCommentBox();

        if (toggleInlineComments.data('toggled') == 'on') {
            toggleInlineComments
                .attr('data-toggled', 'off')
                .data('toggled', 'off');
            toggleInlineComments.find('.toggle').text('Show comments');

            stdAnswerHTML.find('span.inline-hl').css({
                'background': 'none'
            });
            stdAnswerHTML.find('span.inline-cm').css({
                'display': 'none'
            });

            hideShowPrintStdAnswer(true);
        } else if (toggleInlineComments.data('toggled') == 'off') {
            toggleInlineComments
                .attr('data-toggled', 'on')
                .data('toggled', 'on');
            toggleInlineComments.find('.toggle').text('Hide comments');

            stdAnswerHTML.find('span.inline-hl').css({
                'background': ''
            });
            stdAnswerHTML.find('span.inline-cm').css({
                'display': ''
            });

            hideShowPrintStdAnswer(false);
        }
    });
}

function clearHighlightsWithoutComments(send = false) {
    var unwrapped = false;

    if (stdAnswerHTML.find('span.inline-hl').length) {
        stdAnswerHTML.find('span.inline-hl').each(function () {
            var spanId = $(this).attr('id');

            if (!stdAnswerHTML.find('span.inline-cm[data-comment="' + spanId + '"]').length) {
                unwrapped = true;
                unwrapComment(spanId);
            }
        });

        if (unwrapped) {
            saveSendInlineComment(send);
        }
    }
}

/***************************************************** UTILS **********************************************************/

/**
 * If textarea has line breaks insert <br> at beginning and end
 * @param {String} str Textarea text 
 */
function comment2html(str) {
    if (str.match(/\r?\n/g)) {
        str = '<br>' + str + '<br>';
    }
    // str = str.replace(/\r?\n/g, '<br>');
    return str;
}

/**
 * Remove extra <br> when comment has line breaks
 * @param {String} str HTML code
 */
function html2comment(str) {
    return str.replace(/<br[^>]*>/g, '');
}

/**
 * Toggle button color's classes
 * @param {*} e The event
 */
function changeColor(e) {
    var btn = e.target || e.srcElement;
    var commentBox = $(btn).closest('.inline-comment-box');
    var spanId = commentBox.data('span-id');
    var preview = commentBox.find('.change-color i.preview');
    var newColor = $(btn).data('color');

    preview
        .removeClass(currentColor)
        .addClass(newColor);

    var highlight = stdAnswerHTML.find('span.inline-hl[data-comment="' + spanId + '"]');
    if (!previousColor) {
        previousColor = highlight.data('color');
    }

    highlight
        .removeClass(currentColor)
        .addClass(newColor);

    highlight
        .attr('data-color', newColor)
        .data('color', newColor);

    currentColor = newColor;

    preview.toggleClass('fa-strikethrough', currentColor == 'strikethrough');
    preview.toggleClass('fa-square-o', currentColor != 'strikethrough');
}

function changeIcon(e) {
    var btn = e.target || e.srcElement;
    var commentBox = $(btn).closest('.inline-comment-box');
    var spanId = commentBox.data('span-id');
    var preview = commentBox.find('.change-icon i.preview');
    var newIcon = $(btn).data('icon');

    commentBox.find('#errors').html("");

    preview
        .removeClass(`fa-${currentIcon}`)
        .addClass(`fa-${newIcon}`);

    var highlight = stdAnswerHTML.find('span.inline-hl[data-comment="' + spanId + '"]');
    if (!previousIcon) {
        previousIcon = highlight.data('icon');
    }

    highlight
        .removeClass(currentIcon) // <- icon without 'fa'
        .addClass(newIcon);

    highlight
        .attr('data-icon', newIcon)
        .data('icon', newIcon);

    // If editing the comment, update comment icon
    var comment = stdAnswerHTML.find('span.inline-cm[data-comment="' + spanId + '"]');
    if (comment.length) {
        comment
            .removeClass(Object.keys(icons).map(function (icon) { return icon }).join(" "))
            .addClass(newIcon);
    }

    currentIcon = newIcon;
}

/**
 * Check if there is already a highlighted text here
 * @param {*} id The new comment id
 */
function isAlreadyHighlighted(id) {
    var highlighted = false;

    if ($('span.inline-hl[data-comment="' + id + '"]').length) {
        $('span.inline-hl[data-comment="' + id + '"]').each(function () {
            var spanComment = $(this);
            if (spanComment.parents('span[data-status="saved"]').length) {
                highlighted = true;
            }
        });
    }

    return highlighted;
}

/**
 * Check if there is a already a teacher comment here 
 * @param {*} id The new comment id
 */
function isTeacherComment(id) {
    var teacherComment = false;

    if ($('span.inline-hl[data-comment="' + id + '"]').length) {
        $('span.inline-hl[data-comment="' + id + '"]').each(function () {
            var spanComment = $(this);
            if (spanComment.parents('span.inline-cm').length) {
                teacherComment = true;
            }
        });
    }

    return teacherComment;
}

function isHighlightedOutsideStdAnswer(id) {
    var outsideStdAnswer = false;

    if ($('span.inline-hl[data-comment="' + id + '"]').length) {
        $('span.inline-hl[data-comment="' + id + '"]').each(function () {
            var spanComment = $(this);
            if (!spanComment.parents('#modal-write-std-answer').length) {
                outsideStdAnswer = true;
            }
        });
    }

    return outsideStdAnswer;
}

// Custom highlighted errors
function checkHighlightErrors(id) {
    var error = '';
    var inlineComment = 'span.inline-hl[data-comment="' + id + '"]';
    if ($(inlineComment).length) {
        $(inlineComment).each(function () {
            var spanComment = $(this);

            // Checkpoint 1: select any already-highlighted text section
            if (
                spanComment.parents('span[data-status="saved"]').length ||
                spanComment.parents('span[data-status="sent"]').length
            ) {
                error = 'This chunk of text is already highlighted!';
            }

            // Checkpoint 2: select any teacher comment
            if (spanComment.parents('span.inline-cm').length) {
                error = 'You cannot highlight your own comment!'
            }

            // Checkpoint 3: comments are turned off
            if ($('#toggle-inline-comments').data('toggled') == 'off') {
                error = 'You must show comments in order to highlight text!';
            }
        });
    }

    return error;
}

/**
 * Automatically resize textarea height while typing
 * @param {*} element 
 */
function resizeCommentTextarea() {
    var commentBox = $('body').find('.inline-comment-box');
    commentBox.find('textarea').each(function () {
        this.setAttribute('style', "height: 65px; overflow-y: hidden;");
        this.setAttribute('style', "height:" + (this.scrollHeight) + "px; overflow-y: hidden;");
    }).on("input", function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + "px";
    });
}

/**
 * Set comment box position over HTML body
 * @param {*} e 
 */
function setCommentBoxPosition(e) {
    var bodyWidth = $('body').width();
    var left = e.pageX;
    var top = e.pageY;

    // Prevent comment box from overflowing right body side
    if ((left + commentBoxWidth) > bodyWidth) {
        left = bodyWidth - (commentBoxWidth + 100);
    }

    $(commentBox).css({
        left: left,
        top: top,
        width: commentBoxWidth
    });
}

/**
 * Leave comment box with default options when creating a new comment
 * @param {*} id Highlight and comment id
 */
function resetCommentBox(id) {
    $(commentBox).find('a.change-color i.preview')
        .removeClass('fa-strikethrough '+ colors.join(" "))
        .addClass('fa-square-o yellow');

    $(commentBox).find('a.change-icon i.preview')
        .removeClass(Object.keys(icons).map(function (icon) { return `fa-${icon}` }).join(" "))
        .addClass('fa-minus');

    stdAnswerHTML.find('span.inline-hl[data-comment="' + id + '"]').each(function() {
        var highlight = $(this);
        highlight
            .removeClass(colors.join(" "))
            .addClass('yellow');
        highlight
            .attr('data-color', 'yellow')
            .data('color', 'yellow');
        highlight
            .attr('data-icon', 'minus')
            .data('icon', 'minus');
    });

    currentColor = 'yellow';
    currentIcon = 'minus';
}

function showInlineCommentsToggler() {
    var hideShow = 'Hide';
    $('#toggle-inline-comments').show();
    $('#toggle-inline-comments').html([
        `<a href="#" class="toggle">${hideShow} comments</a>`,
    ].join(" "));
}

function hideInlineCommentsToggler() {
    $('#toggle-inline-comments').html("");
    $('#toggle-inline-comments').hide();
}

function hideShowPrintStdAnswer(hide=true) {
    var printTaskLink = $('#print-task-review').find('a').attr('href');
    var params = printTaskLink.split("&");
    var hideShowParam = params[params.length - 1];
    var hs = hide ? 'h' : 's';

    printTaskLink = printTaskLink.replace(hideShowParam, "");
    printTaskLink += `c=${hs}`;
    $('#print-task-review').find('a').attr('href', printTaskLink);
}

/**
 * Whether the student answer has at least one comment or not
 */
function answerHasComments(element=null) {
    if (stdAnswerHTML == null) {
        stdAnswerHTML = element;
    }
    return stdAnswerHTML.find('span.inline-hl').length || stdAnswerHTML.find('span.inline-cm').length
}

/**
 * Unwrap comments, remove comment box and clear current selection
 */
var removeCommentBoxOnScrollEvent = function () {
    $.each([$(window), $('.modal-body')], function (i, el) {
        el.scroll(function () {
            unwrapCurrentHighlightedText();
            removeCommentBox();
            clearSelection();
        });
    });
}

/**
 * Math.random should be unique because of its seeding algorithm.
 * Convert it to base 36 (numbers + letters), and grab the first 9 characters after the decimal
 */
var ID = function () {
    return 'hl-'+ Math.random().toString(36).substr(2, 9);
};

/**********************************************************************************************************************/

function saveSendInlineComment(send = false) {
    var newCommentsSent = false;
    if (send) {
        $('#modal-write-std-answer').find('span[data-status="saved"]').each(function () {
            $(this)
                .attr('data-status', 'sent')
                .data('status', 'sent');
            newCommentsSent = true;
        });
    }

    var answerHtml = $('#modal-write-std-answer').clone();

    // Remove model answers before saving comments!
    if (answerHtml.find('a.modal-answer-showhide').length) {
        answerHtml.find('a.modal-answer-showhide').each(function() {
            var answer= $(this).closest('.manual-q-answer');
            answer.find('.short-modal-answer').remove();
            answer.find('a.modal-answer-showhide').parent('div').remove();
        });
    }

    var url = '/pages/std-access/std-written-tasks-actions.php';
    var data = {
        'action'        : 'save-inline-comment',
        'ticket'        : $('#ticket').val(),
        'log'           : $('#modal-write-std-log').val(),
        'subject'       : $('#modal-write-general-id').val(),
        'std'           : $('#modal-write-std').val(),
        'std-task-id'   : $('#modal-std-task-id').val(),
        'content'       : answerHtml.html(),
        'new-send'      : newCommentsSent ? 'true' : 'false',
    }

    $.post(url, data, function (response) {
        if (response.success == 1) {
            previousColor = null;
            previousIcon = null;
            removeCommentBox();
            answerHasComments() ? showInlineCommentsToggler() : hideInlineCommentsToggler();
            $('#modal-write-save, #modal-write-send').attr('disabled', false);
        } else {
            alert(response.msg);
        }
    }, 'json');
}