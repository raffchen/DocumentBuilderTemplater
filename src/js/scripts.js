const { globalShortcut, dialog } = require('electron').remote

var core = {
	sections : null,
	answers : {},
	answerInserts : {},
	finalInserts : {},
	currentSectionIndex : 0
}

const fs = require('fs')

var answerDiv = document.getElementById("questionAnswer");
var editor;

// on the landing panel, have a button where they can browse for a file
function startProgramHandler() {
	startEditor();

	setTimeout(readEditor, 5000);
}

function startEditor() {
	editor = ace.edit("REPL");
	editor.setTheme("ace/theme/tomorrow_night");
	editor.setFontSize(14);
	editor.session.setMode("ace/mode/json");
}

function readEditor() {
	var input = editor.getValue();

	try {
		var config = JSON.parse(input);
		handleConfigs(config);
	} catch (SyntaxError) {

	}

	setTimeout(readEditor, 5000);
}

function handleConfigs(sections) {
	if(sections != null) {
		core.sections = sections;
		console.log("Loaded sections from config file.");
	}

	if(core.sections != null) {
		console.log("finished loading and storing all configs");
		setup();
	}
}

function setup() {
	// Assemble the progress pane from the loaded sections
	makeProgressPane();

	// For now, we run the script for search warrants
	searchWarrantScript();

	// Set the height of the main window
    $('#topGrid').height(window.innerHeight);
}

function makeProgressPane() {
	$('#navbar').html("");
	// For each section, make an append a button that loads its section
	for(i in core.sections) {
		var sectionTitle = core.sections[i].sectionTitle;

		var progressButton = document.createElement("a");
		progressButton.className = "progressButton";
		progressButton.innerHTML = sectionTitle;
		progressButton.id = i;
		progressButton.name = sectionTitle + "_button";
		progressButton.addEventListener("click", progressButtonHandler)

		var progressContent = document.getElementById('navbar');
		progressContent.appendChild(progressButton);
	}
}

function searchWarrantScript() {
	// Toggle the first button visually
	$('#'+core.currentSectionIndex).toggleClass('active');

	// Load the current section
	loadSection(core.currentSectionIndex, answerDiv);

	setBodyScale();
}

// This function creates and appends a single input line with a label
function addSingleLineInput(questionID, questionLabel) {
	var label = document.createElement("div");

	label.className = "singleLineInputFieldLabel";
	label.id = questionID + "_label";
	label.innerHTML += questionLabel;
	answerDiv.appendChild(label);

	var input = document.createElement("input");
	input.type = "text";
	input.className = "singleLineInputField"; // set the CSS class
	input.id = questionID;

	if(core.answers[questionID] != undefined && core.answers[questionID] != "") {
		input.value = core.answers[questionID];
	}

	answerDiv.appendChild(input); // put it into the DOM
}

// This function creates and appends a text box input with default text if given
function addTextBoxInput(questionID, questionLabel, defaultText) {
	var label = document.createElement("div");

	label.className = "textBoxFieldInputLabel";
	label.id = questionID + "_label";
	label.innerHTML += questionLabel;
	answerDiv.appendChild(label);

	var input = document.createElement("textarea");
	input.type = "text";
	input.wrap = "soft";
	input.className = "textBoxFieldInput"; // set the CSS class
	input.id = questionID;

	if(core.answers[questionID] != undefined && core.answers[questionID] != "") {
		input.value = core.answers[questionID];
	} else if(defaultText != null) {
		input.value = defaultText;
	}

	answerDiv.appendChild(input); // put it into the DOM
	resizeTextarea();
}

function resizeTextarea() {
	$('textarea').each(function () {
		this.setAttribute('style', 'height:' + (this.scrollHeight + 3) + 'px;overflow-y:auto;');
	  });
}

// This function creates and appends a yes/no question that will toggle the section
function addyesNoQuestion(questionID, questionLabel) {
	var label = document.createElement("div");
	label.className = "textBoxFieldInputLabel";
	label.innerHTML += questionLabel;

	var buttonDiv = document.createElement("div");
	buttonDiv.className = "questionButtonGroup";
	buttonDiv.id = questionID + "_Group";

	var yesButton = document.createElement("button");
	yesButton.id = questionID + "_YesButton";
	yesButton.name = questionID;
	yesButton.className = "questionButton btn";
	yesButton.innerHTML = "Yes";
	yesButton.onclick = yesNoButtonHandler;

	var noButton = document.createElement("button");
	noButton.id = questionID + "_NoButton";
	noButton.name = questionID;
	noButton.className = "questionButton btn";
	noButton.innerHTML = "No";
	noButton.onclick = yesNoButtonHandler;

	if(core.answers[questionID]) {
		yesButton.className += " active";
	} else {
		noButton.className += " active";
	}

	buttonDiv.appendChild(noButton); 
	buttonDiv.appendChild(yesButton);

	answerDiv.appendChild(label);
	answerDiv.appendChild(buttonDiv);
}

// This function creates a multiple choice question that only allows for one selected answer
function addSingleChoiceOption(questionID, questionLabel, options) {
	var label = document.createElement("div");

	label.className = "singleLineInputFieldLabel";
	label.id = questionID + "_label";
	label.innerHTML += questionLabel;
	answerDiv.appendChild(label);

	var form = document.createElement("form");
	form.id = questionID;
	form.className = "radioInputField";
	for(i in options) {
		var wrapper = document.createElement("div");
		wrapper.className = "radioOptionWrapper";

		var radioOption = document.createElement("input");
		radioOption.type = "radio";
		radioOption.value = options[i];
		radioOption.name = questionID;
		radioOption.className = "radioOption";
		wrapper.appendChild(radioOption);

		wrapper.appendChild(document.createTextNode(options[i]));

		form.appendChild(wrapper);
	}

	answerDiv.appendChild(form);
}

function yesNoButtonHandler() {
	var yesOrNo = $(window.event.target)[0].outerText;
	var questionID = $(window.event.target)[0].name;

	if( (yesOrNo.toLowerCase() === "yes" && !core.answers[questionID]) || (yesOrNo.toLowerCase() === "no" && core.answers[questionID]) ){
		$(`#${questionID}_Group`).children('button').each(function() {$(this).toggleClass('active')});
	}

	var sectionInputs = core.sections[core.currentSectionIndex].sectionInputs;

	if(yesOrNo.toLowerCase() == "yes") { // The button pressed was a "Yes" button
		if(!core.answers[questionID]) { // Continue only if "Yes" button wasn't already pressed
			core.answers[questionID] = true; // Set the current question to true
			$('#submitButton').remove(); // Remove the submit button for now

			// For each question/input in this section that is not a yes/no question, create and append it
			var yesNoIndex = sectionInputs.findIndex(element => element.questionID == questionID);

			for(var n = yesNoIndex+1; n < sectionInputs.length; n++) {
				var sectionInput = sectionInputs[n];
				
				if(sectionInput.questionID != questionID) {
					if(sectionInput.inputType == "yesNoQuestion") {
						addyesNoQuestion(sectionInput.questionID, sectionInput.inputLabel);
					} else if(sectionInput.inputType == "singleLineText") {
						addSingleLineInput(sectionInput.questionID, sectionInput.inputLabel);
					} else if(sectionInput.inputType == "textBoxInput") {
						addTextBoxInput(sectionInput.questionID, sectionInput.inputLabel, sectionInput.defaultText);
					} else if(sectionInput.inputType == "singleChoiceOption") {
						addSingleChoiceOption(sectionInput.questionID, sectionInput.inputLabel, sectionInput.radioOptions);
					}
				}
			}

			// Re-add the submit button
			addSubmitButton();
		}

	} else {
		core.answers[questionID] = false;

		for(i in sectionInputs) {
			if(i > sectionInputs.findIndex(element => element.questionID == questionID)) {
				var sectionInput = sectionInputs[i];
				$('#' + sectionInput.questionID).remove();
				$(`#${sectionInput.questionID}_label`).remove();
			}
		}
	}
}

function progressButtonHandler() {
	var progressID = $(window.event.target)[0].id;
	$('.active').toggleClass('active');
	$(window.event.target).toggleClass('active');

	core.currentSectionIndex = progressID;
	loadSection(progressID);

	if(core.currentSectionIndex == core.sections.length-1) {
		$('#submitButton').html("Submit and Make Document");
	}
}

function addSubmitButton() {
	var button = document.createElement("button");
	button.id = "submitButton";
	button.className = "submitButton btn";
	button.innerHTML = "Save and Continue";
	button.addEventListener("click", submitButtonHandler);
	answerDiv.appendChild(button);
}

function submitButtonHandler() {
	// we need to keep track of the current section and then advance to the next one when the submit button is pressed
	core.currentSectionIndex++;
	if(core.currentSectionIndex >= core.sections.length) {
		// here we should display a confirmation dialog and if they confirm, write the data to the sheet and end the program
		$('#submitButton').html("Submit and Make Document");
		$('#submitButton').width("200px");
	} else if(core.currentSectionIndex == core.sections.length-1) {
		// We are on the LAST section
		loadSection(core.currentSectionIndex, answerDiv);
		$('.active').toggleClass('active');
		$('#'+core.currentSectionIndex).toggleClass('active');

		$('#submitButton').html("Submit and Make Document");

		// change the button text
	} else {
		loadSection(core.currentSectionIndex, answerDiv);
		$('.active').toggleClass('active');
		$('#'+core.currentSectionIndex).toggleClass('active');
	}
}

function loadSection(sectionIndex) {
	var targetSection = core.sections[sectionIndex];
	// clear the screen
	$('#questionText').empty();
	$('#questionAnswer').empty();
	$('#help').empty();

	var goodToGo = true;
	if(targetSection.sectionConditions.length > 0) {
		// then there is a condition we must be aware of
		for(i in targetSection.sectionConditions) {
			if(!core.answers[targetSection.sectionConditions[i]]) {
				goodToGo = false;
			}
		}
	}

	if(goodToGo) {
		// set the question text
		$('#questionText').html(targetSection.sectionText);

		// loop through the inputs and make each thing
		for(index in targetSection.sectionInputs) {
			if(targetSection.sectionInputs[index].inputType == "singleLineText") {
				addSingleLineInput(targetSection.sectionInputs[index].questionID, targetSection.sectionInputs[index].inputLabel);

			} else if(targetSection.sectionInputs[index].inputType == "textBoxInput") {
				addTextBoxInput(targetSection.sectionInputs[index].questionID, targetSection.sectionInputs[index].inputLabel, targetSection.sectionInputs[index].defaultText);

			} else if(targetSection.sectionInputs[index].inputType == "yesNoQuestion") {
				addyesNoQuestion(targetSection.sectionInputs[index].questionID, targetSection.sectionInputs[index].inputLabel);
				if(core.answers[targetSection.sectionInputs[index].questionID] == undefined || !core.answers[targetSection.sectionInputs[index].questionID]) {
					break;
				}

			} else if(targetSection.sectionInputs[index].inputType == "singleChoiceOption") {
				addSingleChoiceOption(targetSection.sectionInputs[index].questionID, targetSection.sectionInputs[index].inputLabel, targetSection.sectionInputs[index].radioOptions)
			}
		}

		addSubmitButton();
		loadHelpPane();
	} else {
		// cannot load this section due to a previous choice. tell them that.
		var reason = targetSection.sectionConditionsFalse;
		$('#questionText').html(reason);
		addSubmitButton();
	}
}

function loadHelpPane() {
	var targetSection = core.sections[core.currentSectionIndex];
	var sectionHelp = targetSection.sectionHelp;
	console.log(targetSection)


	for(var i in sectionHelp) {
		if(sectionHelp[i].helpType == "helpText") {
			if(sectionHelp[i].helpTitle != "") {
				// Create and append a title section
				var title = document.createElement('div');
				title.className = "helpTitle";
				title.innerHTML = sectionHelp[i].helpTitle;
				$('#help').append(title);
			}

			// Create and append a text section
			var text = document.createElement('div');
			text.className = "helpText";
			text.innerHTML = sectionHelp[i].helpContent;
			$('#help').append(text);

		} else if(sectionHelp[i].helpType == "helpInsert") {
			// Create and append a button along with the text it inserts
			var insertWrapper = document.createElement("div");
			insertWrapper.className = "insertWrapper";

			var insertButton = document.createElement("button");
			insertButton.id = "insertButton";
			insertButton.className = "btn";
			insertButton.innerHTML = "Insert";
			insertButton.customContent = sectionHelp[i].helpContent;
			insertButton.targetQuestion = sectionHelp[i].targetQuestionID;
			insertButton.addEventListener("click", insertButtonHandler);
			insertWrapper.appendChild(insertButton);

			var insertText = document.createElement('div');
			insertText.className = "insertText";
			insertText.innerHTML = sectionHelp[i].helpContent;
			insertWrapper.appendChild(insertText);

			$('#help').append(insertWrapper);
		}
	}
}

function insertButtonHandler() {
	var insertText = $(window.event.target)[0].customContent;
	var questionID = $(window.event.target)[0].targetQuestion;
	console.log(insertText)
	console.log(questionID)

	$('#' + questionID).val($('#' + questionID).val() + '\n' + insertText);
	resizeTextarea();
}

$(document).delegate('.textBoxFieldInput', 'keydown', function(e) {
  var keyCode = e.keyCode || e.which;

  if (keyCode == 9) {
    e.preventDefault();
    var start = this.selectionStart;
    var end = this.selectionEnd;

    // set textarea value to: text before caret + tab + text after caret
    $(this).val($(this).val().substring(0, start)
                + "\t"
                + $(this).val().substring(end));

    // put caret at right position again
    this.selectionStart =
    this.selectionEnd = start + 1;
  }
});

var $body = $('body'); //Cache this for performance
var $zoomElements = $('#help, #questionText, #questionAnswer, #progressContent')

var setBodyScale = function() {
    var scaleSource = $body.width(),
        scaleFactor = 0.1,                     
        maxScale = 200,
        minScale = 120; //Tweak these values to taste

    var fontSize = scaleSource * scaleFactor; //Multiply the width of the body by the scaling factor:

    if (fontSize > maxScale) fontSize = maxScale;
    if (fontSize < minScale) fontSize = minScale; //Enforce the minimum and maximums

    //$('#helpPane').css('font-size', fontSize + '%');
    $zoomElements.css('font-size', fontSize + '%');
}

$(window).on('resize', function() {
	$('#topGrid').height(window.innerHeight);
	setBodyScale();
})

const shell = require('electron').shell;

// assuming $ is jQuery
$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
});

// open save dialog
$('#REPL-button').click(function() {
	dialog.showSaveDialog({
		title: "Save Document",
		buttonLabel: "Save Document",
		filters: [{name: 'json', extensions: ['json']}]
	}).then(function(value) {
		fs.writeFile(value.filePath, editor.getValue(), (err) => {
			if (err) throw err;
			console.log('Saved');
		})
	});
});