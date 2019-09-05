const { dialog } = require('electron').remote

var core = {
	sections : null,
	answers : {},
	answerInserts : {},
	finalInserts : {},
	currentSectionIndex : 0
}

var answerDiv = document.getElementById("questionAnswer");

var fs = require('fs');
var path = require('path');


// on the landing panel, have a button where they can browse for a file
function startProgramHandler() {
	jQuery('#landingPanel').fadeOut();

	if(configPath == "") {
		configPath = "../templates/sections.json";
	}

	$.getJSON(configPath, function(data) {
		handleConfigs(data);
	})
}

var configPath = "";
var templatePath = "";
function selectConfigHandler() {
	var dialogPaths = dialog.showOpenDialogSync({
		title: "Select Configuration File (sections.json)",
		buttonLabel: "Use File",
		properties: ["openFile"],
		message: "Select the sections.json to use. See documentation for more details.",
		filters: [
		    {name: 'Json', extensions: ['json']},
		    {name: 'All Files', extensions: ['*']}
		]
	});

	if(dialogPaths != undefined && dialogPaths.length == 1) {
		configPath = dialogPaths[0];
	} else {
		configPath = "../templates/sections.json";
	}

	$('#landingSelectedConfigPath').html(configPath);
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
	// For each section, make an append a button that loads its section
	for(i in core.sections) {
		var sectionTitle = core.sections[i].sectionTitle;

		var progressButton = document.createElement("a");
		progressButton.className = "progressButton nav-link";
		progressButton.innerHTML = sectionTitle;
		progressButton.id = i;
		progressButton.name = sectionTitle + "_button";
		progressButton.addEventListener("click", progressButtonHandler)

		var progressContent = document.getElementById('progressContent');
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
	
	/* var button = document.createElement("button");
	button.id = questionID + "Button";
	button.name = questionID;
	button.className = "infoButton";
	button.innerHTML = "<i class='step fi-info infoIcon' onclick='infoButtonHandler();'></i>";
	button.onclick = infoButtonHandler;
	label.appendChild(button); */

	label.className = "singleLineInputFieldLabel w-100";
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
	
	/* var button = document.createElement("button");
	button.id = questionID + "Button";
	button.name = questionID;
	button.className = "infoButton";
	button.innerHTML = "<i class='step fi-info infoIcon' onclick='infoButtonHandler();'></i>";
	button.onclick = infoButtonHandler;
	label.appendChild(button); */

	label.className = "textBoxFieldInputLabel w-100";
	label.id = questionID + "_label";
	label.innerHTML += questionLabel;
	answerDiv.appendChild(label);

	var input = document.createElement("textarea");
	input.type = "text";
	input.wrap = "soft";
	input.className = "textBoxFieldInput w-100"; // set the CSS class
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
	buttonDiv.className = "my-3 btn-group";
	buttonDiv.id = questionID + "_Group";

	var yesButton = document.createElement("button");
	yesButton.id = questionID + "_YesButton";
	yesButton.name = questionID;
	yesButton.className = "questionYesButton btn btn-secondary";
	yesButton.innerHTML = "Yes";
	yesButton.onclick = yesNoButtonHandler;

	var noButton = document.createElement("button");
	noButton.id = questionID + "_NoButton";
	noButton.name = questionID;
	noButton.className = "questionNoButton btn btn-secondary";
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
	
	/* var button = document.createElement("button");
	button.id = questionID + "Button";
	button.name = questionID;
	button.className = "infoButton";
	button.innerHTML = "<i class='step fi-info infoIcon' onclick='infoButtonHandler();'></i>";
	button.onclick = infoButtonHandler; 
	label.appendChild(button); */

	label.className = "singleLineInputFieldLabel w-100";
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

function infoButtonHandler() {
	/*
	var questionID = $(window.event.target).parent()[0].name;

	// send the infoBarText data to the main process for a new window

	$('#helpPane').empty();
	var infoPanel = document.getElementById("helpPane");

	var infoText = "<p>" + core.infoBarText[questionID].infoText.replace(new RegExp("\n", 'g'), "<br>&emsp;&emsp;") + "</p>";
	$('#helpPane').html(infoText);

	if(core.infoBarText[questionID].buttons.length > 0) {
		var buttons = core.infoBarText[questionID].buttons;
		for(var i in buttons) {
			// we need the button text and the button data
			var button = document.createElement("button");
			button.name = buttons[i].buttonData;
			button.className = "moreInfoButton";
			button.innerHTML = buttons[i].buttonText;
			button.addEventListener("click", moreInfoButtonHandler);
			infoPanel.appendChild(button);
		}
	}
	*/
}

function moreInfoButtonHandler() {
	/*
	var data = $(window.event.target)[0].name;
	ipcRenderer.send('infoWindow', data);
	*/
}

function progressButtonHandler() {
	var progressID = $(window.event.target)[0].id;
	$('.active').toggleClass('active');
	$(window.event.target).toggleClass('active');
	saveInputs();

	core.currentSectionIndex = progressID;
	loadSection(progressID);

	if(core.currentSectionIndex == core.sections.length-1) {
		$('#submitButton').html("Submit and Make Document");
	}
}

function addSubmitButton() {
	var button = document.createElement("button");
	button.id = "submitButton";
	button.className = "submitButton w-100 mt-3 btn btn-primary";
	button.innerHTML = "Save and Continue";
	button.addEventListener("click", submitButtonHandler);
	answerDiv.appendChild(button);
}

function submitButtonHandler() {
	// we need to get the supplied answers for all input fields and save them with their question ID in core.answers
	saveInputs();

	// we need to keep track of the current section and then advance to the next one when the submit button is pressed
	core.currentSectionIndex++;
	if(core.currentSectionIndex >= core.sections.length) {
		// here we should display a confirmation dialog and if they confirm, write the data to the sheet and end the program
		$('#submitButton').html("Submit and Make Document");
		$('#submitButton').width("200px");

		var makeDocumentBoolean = confirm("Are you sure you want to make the document?");
		if(makeDocumentBoolean) {
			makeDocument();
		}

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

function saveInputs() {
	if(core.currentSectionIndex < core.sections.length) {
		for(i in core.sections[core.currentSectionIndex].sectionInputs) {
			var section = core.sections[core.currentSectionIndex].sectionInputs[i];
			if(section.inputType == "singleLineText") {
				var inputText = $('#' + section.questionID).val();
				core.answers[section.questionID] = inputText;

			} else if(section.inputType == "textBoxInput") {
				var inputText = $('#' + section.questionID).val();
				core.answers[section.questionID] = inputText;

			} else if(section.inputType == "singleChoiceOption") {
				var radioOptions = document.getElementsByName(section.questionID);

				for(i in radioOptions) {
					if(radioOptions[i].checked) {
						core.answers[section.questionID] = radioOptions[i].value;
					}
				}
			}
		}
	}
}

function loadSection(sectionIndex) {
	var targetSection = core.sections[sectionIndex];
	// clear the screen
	$('#questionText').empty();
	$('#questionAnswer').empty();
	$('#helpPane').empty();

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

function makeDocument() {
	for(var key in core.answers) {
		switch(key) {
			case 'delay_notice_yesNo':
				if(core.answers.sealed_warrant_yesNo && core.answers.delay_notice_yesNo) {
					core.finalInserts['request_to_delay_insert'] = "Pursuant to Penal Code section 1546.2(b)(1), this court has the authority to delay notification to the target of this investigation for up to ninety (90) days upon a showing that contemporaneous notice will have an adverse result. Penal Code section 1546 (a) defines adverse result as: danger to the life or physical safety of an individual; flight from prosecution; destruction of or tampering with evidence; intimidation of potential witnesses; and serious jeopardy to an investigation or undue delay of a trial.\n\nAdditionally, your affiant is aware that service providers, including Facebook, will customarily notify the account holder of a government request for account information, absent a court order prohibiting such notification.  Your affiant hereby requests an order requiring the service provider(s) to make all attempts to preserve all information related to the above account(s) (18 USC 2703(f)), and delay notification to subscriber(s) or any party providing information from notifying any other party, with the exception of other verified law enforcement agencies, that this information has been sought.\n\n";
					core.finalInserts["delay_notice_yesNo"] = true;

				} else {
					core.finalInserts["delay_notice_yesNo"] = false;
				}
				break;

			case 'foreign_or_local_corporation':
				if(core.answers[key] == "Foreign Corporation") {
					core.finalInserts[key] = "BLAH";

				} else if(core.answers[key] == "California Corporation") {
					core.finalInserts[key] = "BLAH";

				}
				break;

			case 'multiple_or_single_location':
				if(core.answers[key] == "Single Location") {
					core.finalInserts[key] = "I also know that the time period to obtain these records from most electronic and Internet based service providers, as well as the computer forensics, takes longer than the allotted ten-day warrant return period as required by statute [and department policy].  Therefore, I request that the warrant return date be adjusted to be due within 10 days of receipt of the information from a service provider or computer forensics laboratory.";

				} else if(core.answers[key] == "Multiple Locations") {
					core.finalInserts[key] = "I also know that the time period to obtain these records from most electronic and Internet based service providers, as well as the computer forensics, takes longer than the allotted ten-day warrant return period as required by statute [and department policy].  Furthermore, producing returns for each of the multiple locations as they are received would be burdensome to both the investigators as well as the courts.  Therefore, I request that the warrant return date be adjusted to be due within 10 days of receipt of the final information received from a service provider or computer forensics laboratory.";

				}
				break;

			case 'delivery_phone_number':
				core.finalInserts[key] = "Phone " + core.answers[key];
				break;

			case 'delivery_fax_number':
				core.finalInserts[key] = "/ FAX " + core.answers[key];
				break;

			default:
				core.finalInserts[key] = core.answers[key];
		}
	}

	if(templatePath == undefined || templatePath == "") {
		templatePath = path.resolve(__dirname, '../search_warrant_template.docx');
	}
	
	var content = fs.readFileSync(templatePath, 'binary');
	var zip = new JSZip(content);
	var doc = new Docxtemplater();
	doc.setOptions({
		linebreaks: true,
		nullGetter: function(part, scopeManager) {
		    if (!part.module) {
		        return "PLEASE_COMPLETE";
		    }
		    if (part.module === "rawxml") {
		        return "";
		    }
		    return "";
		}
	})

	doc.loadZip(zip);
	doc.setData(
	    core.finalInserts
	);

	try {
	    doc.render()
	}
	catch (error) {
	    var e = {
	        message: error.message,
	        name: error.name,
	        stack: error.stack,
	        properties: error.properties,
	    }
	    console.log(JSON.stringify({error: e}));
	    // The error thrown here contains additional information when logged with JSON.stringify (it contains a property object).
	    throw error;
	}

	var savePath = dialog.showSaveDialog({
		title: "Save Document",
		defaultPath: path.join(require('os').homedir(), 'Desktop/output.docx'),
		buttonLabel: "Save Document"
	});

	if(savePath.filePath != undefined) {
		var buf = doc.getZip().generate({type: 'nodebuffer'});
		fs.writeFileSync(savePath.filePath, buf);
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
				title.className = "helpTitle h4";
				title.innerHTML = sectionHelp[i].helpTitle;
				$('#helpPane').append(title);
			}

			// Create and append a text section
			var text = document.createElement('div');
			text.className = "helpText pb-3";
			text.innerHTML = sectionHelp[i].helpContent;
			$('#helpPane').append(text);

		} else if(sectionHelp[i].helpType == "helpInsert") {
			// Create and append a button along with the text it inserts
			var insertWrapper = document.createElement("div");
			insertWrapper.className = "insertWrapper pb-3";

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

			$('#helpPane').append(insertWrapper);
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
var $zoomElements = $('#helpPane, #questionText, #questionAnswer, #progressContent')

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