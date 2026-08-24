
/* ONLOAD ACTIONS */
$(document).ready(function() {
var hiddenContext = $("#hiddenContext").text(),
    hiddenUrlName = "#hiddensearchurl",
// Identify the underlying page...
    pageId = $("body").attr("id"),
    thisPage = $("#" + pageId),
    excludeContributors = "&operator13=NOT&option13=noContributor&value13=Contributor",
    excludeInstitutions = "&operator14=NOT&option14=noInstitution&value14=Institution",
    excludeTopics       = "&operator15=NOT&option15=noTopic&value15=Concept",
// Define components of search url
    baseSearchUrl = hiddenContext + "/search/ahahsearch.action",
    searchUrlPt1  = hiddenContext + "/search/ahahsearch.action?value1=",
    searchUrlPt2a = "&option1=pub_concept&option912=resultCategory&value912=ResearchPublicationContent" + excludeContributors + excludeInstitutions,   // Standard concept search
    searchUrlPt2b = "&option1=pub_concept&option912=resultCategory&value912=MagazineContent" + excludeContributors + excludeInstitutions,              // PTOL concept search
    searchUrlPt2c = "&option1=contributorsForConceptsearch&option912=contentType&value912=Contributor&option13=contributorsearch",                     // Author concept search
    searchUrlPt2d = "&option1=author&option912=resultCategory&value912=ResearchPublicationContent" + excludeContributors + excludeInstitutions,        // Standard contributor search
    searchUrlPt3  = "&fmt=ahah&from=concepthomepage&noRedirect=true",                                                                                //
    searchUrlPt4  = "&sortField=prism_publicationDate&sortDescending=true",
    searchUrlAhah = hiddenContext + "/search/ahahsearch.action",
    ERR_MSG1 = "<p class=\"ajax-error\">An error has occurred and it has not been possible to return any results.</p>" ;	    


//Function taken out of the global namespace...
var SABINETsr = SABINETsr || {
    /*
     * Processes the refined search on topics page
     * checks if there is a refinement url
     * if not, gets original search url
     * If yes check the refinementNumber should increment by 1
     * new url is used to fetch results via ahah
     */
    processRefinedSearchAhah: function() {
    	var startUrl = "",
    	refinedSearchUrl = "",
    	newUrl = "",
        searchUrl = "",
        activeTabContentId = "",
        highestNum,
        current80num,
        tabContextOption12,
        consoleOk = false,
        fetchPageVar;
    
    	//what tab is active? replace this when fetching via ahah
    	if($('#researchpublicationscontent').hasClass('active')){
    		activeTabContentId = "#researchpublicationsconceptcontent";
    		startUrl = $("#sortForm").serialize();
    		tabContextOption12 = 'ResearchPublicationContent';
    	} else if($('#physicstodaycontent').hasClass('active')){
    		activeTabContentId = "#physicstodayconceptcontent";
    		startUrl = $("#ptol_hiddensearchurl").text();
    		tabContextOption12 = 'MagazineContent';
    	}
    	// console.log(activeTabContentId+" star url is:"+startUrl);
    	hiddenUrlName = "#hiddenrefinedsearchurl";

    	//check for url in hidden div
    	if($('#hiddenrefinedsearchurl').text().length > 1){    		
    		searchUrl = $(hiddenUrlName).text();
    		//find highest 80* option
    		refinementnum = 801;
    		current80num = 801;
            param_split = searchUrl.split("&");
            for (i = 0; i < param_split.length; i++) {
                name_value_split = param_split[i].split("=");
                if (name_value_split[0].search("option80") > 0) {
                	current80num = name_value_split[0].replace("option", "");
                	current80num = Number(current80num);            	
                }
                if (name_value_split[0].search("operator80") > 0) {
                	current80num = name_value_split[0].replace("operator", "");
                	current80num = Number(current80num);
                }
                if (name_value_split[0].search("value80") > 0) {
                	current80num = name_value_split[0].replace("value", "");
                	current80num = Number(current80num);
                }
                            
            	if(current80num >= refinementnum) { //check if highest num
            		refinementnum = current80num + 1;
            	}               
            }

            // change 801 to highest value
            //console.log(refinementnum);
            searchUrl = searchUrl.replace(/801/g, String(refinementnum));
            searchUrl = searchUrl.replace(/&value912=[^&]*/, "&value912="+tabContextOption12);
    		refinedSearchUrl = searchUrl + $("#searchrefineform").serialize();
    		
    		//save url and fetch results
    		$(hiddenUrlName).text(refinedSearchUrl);
    		fetchPageVar = SABINETsr.fetchAhahPage(refinedSearchUrl, activeTabContentId, null);
    	} else if (startUrl !== "" && $('#hiddenrefinedsearchurl').text().length < 2) {    		
        	refinedSearchUrl = startUrl + "&" + $("#searchrefineform").serialize() + "&sortDescending=true&sortField=prism_publicationDate";
        	//save url and fetch results
        	$(hiddenUrlName).text(refinedSearchUrl);   	
        	fetchPageVar = SABINETsr.fetchAhahPage(refinedSearchUrl, activeTabContentId, null);
        } 
    	// console.log('test');
    	//console.log(refinedSearchUrl);
    	//Reset
    	fetchPageVar;   		    	    	
    },
    /**
     * Simple numeric check...
     *
     * @param {putative number} num
     */
    isNumeric: function(num) {
        return !isNaN(parseFloat(num)) && isFinite(num);
    },

    /**
     * Update the currentUrl links for all Add to Favourite links...
     *
     * @param {string}          htmlHook            Point of insertion of returned page
     */
    updateAddToFavouritesLinks: function(htmlHook) {
        var newUrl = "",
            winPath = window.location.pathname,
            winSearch = window.location.search;
        newUrl = newUrl = (winPath.substr(0, 8) === hiddenContext ? winPath.substr(8) : winPath) + winSearch;
        $(htmlHook).find("input[name=currentUrl]").each(function() {
            $(this).val(newUrl);
        });
    },

    /**
     * Handle the AJAX in one place...
     *
     * @param {url}             searchUrl
     * @param {string}          htmlHook            Point of insertion of returned page
     * @param {jQuery object}   thisPage
     * @param {string}          actionType          blank | REMOVE (optional)
     */
    fetchAhahPage: function(conceptSearchUrl, htmlHook, thisPage, actionType) {
        // if (SABINETApp.consoleOK) {console.info("fetchAhahPage() parameters:\n1. url: " + conceptSearchUrl + "\n2. hook: " + htmlHook + "\n3. action: " + actionType);}
        var i = 0,
            item,
            newData = {},
            newVars = SABINETApp.getUrlVars(conceptSearchUrl),
            newLen = newVars.length,
            newVal = "",
            oldData = {},
            oldLen = 0,
            oldVal = "",
            oldVars = [],
            pageUrl = $(hiddenUrlName).text() || conceptSearchUrl,
            pStr = "",
            reArray = [ /\+/g, /%27/g, /%2F/gi, /%2B/gi, /%22/gi ],
            saveData = {},
            tmpUrl = "",
            loading;
        
        //temporarily disable refine search box input
        $('#searchRefineGo').attr('disabled', 'true').addClass('disabled');
    	$('#content').addClass('cursorDisabled');
    
        oldVars = SABINETApp.getUrlVars(pageUrl);
        oldLen = oldVars.length;

        // Parse the old url...
        for (i = 0; i < oldLen; i++) {
            oldVal = oldVars[oldVars[i]];
            if (oldVal) {
                oldVal = oldVal.replace(reArray[0] , " ");
                oldData[oldVars[i]] = oldVal.replace(reArray[1], "\"").replace(reArray[2], "/").replace(reArray[3], " ").replace(reArray[4], "\"");
                if (SABINETsr.isNumeric(oldVal)) {
                    oldData[oldVars[i]] = oldVal - 0;
                }
            }
        }

        // Parse the new url...
        for (i = 0; i < newLen; i++) {
            newVal = newVars[newVars[i]];
            if (newVal) {
                newVal = newVal.replace(reArray[0] , " ");
                newData[newVars[i]] = newVal.replace(reArray[1], "\"").replace(reArray[2], "/").replace(reArray[3], " ").replace(reArray[4], "\"");
                if (SABINETsr.isNumeric(newVal)) {
                    newData[newVars[i]] = newVal - 0;
                }
            }
        }

        // Merge details...
        $.extend(oldData, newData);

        // Remove any facets that need removing...
        if (actionType === "REMOVE") {
            oldData = newData;
        }

        for (item in oldData) {
            if (oldData.hasOwnProperty(item)) {
                pStr += item + "=" + oldData[item] + "&";
            }
        }

        tmpUrl = baseSearchUrl + "?" + pStr;

        // Store the url on all the tabs...
        $(hiddenUrlName).text(tmpUrl);

        $.ajax({
            type: "POST",
            url: baseSearchUrl,
            data: oldData,
            dataType: "text",
            success: function(resp, statusText) {
            	
                if (resp !== null) {
                    $(htmlHook).get(0).innerHTML = resp;
                    MathJax.Hub.Queue(["Typeset", MathJax.Hub, $(htmlHook).get(0)]);
                    $.cachedScript("/js/" + ingentaCMSApp.instanceprefix + "/ecommerceicons.js");
                    alert('I got ere 1!');
                    $.cachedScript("/js/" + ingentaCMSApp.instanceprefix + "/search_results_ecommerceicons.js");
                }
                
            },
            error: function(req, statusText, message) {
                $(htmlHook).get(0).innerHTML = ERR_MSG1;
            },
            complete: function(req, statusText) {
                $(htmlHook).prev(".resultsloading").remove();
                if (thisPage !== null) {
                    thisPage.removeClass("cursorWait");
                }
                if (statusText === "success") {
                    SABINETsr.updateAddToFavouritesLinks(htmlHook);
                   //clear input and re-enable refine search box input
                    if($('#searchrefineform').css('display') == 'block'){
                    	$('#searchrefineform input[type="text"]').val("");
                      	$('#searchRefineGo').removeAttr('disabled').removeClass('disabled');
                    }          	
                  	
                    //show explanation text above refine search box
                    if($('#researchpublicationscontent').hasClass('active') || $('#physicstodaycontent').hasClass('active')){
                    	$('.searchExplanation').html("").html($('.explanationText')).slideDown(); //add text
                    } else {
                    	$('.explanationText').html("");
                    	$('.searchExplanation').hide();
                    }

                	if ($('#hiddenrefinedsearchurl').text().length > 1) {
                		if($('.searchRefineReturn').hasClass('hidden')){
                    		$('.searchRefineReturn').removeClass('hidden');
                    	}
                	}else{
                		if(!$('.searchRefineReturn').hasClass('hidden')){
                    		$('.searchRefineReturn').addClass('hidden');
                    	}
                	}
                  	
                }
                
                $('#content').removeClass('cursorDisabled');
               
            }
        });
    },

    /**
     * Handle the AJAX for sorting...
     *
     * @param {url}             baseSearchUrl
     * @param {string}          sortForm
     * @param {string}          htmlHook
     * @param {jQuery object}   thisPage
     */
    fetchSortResponse: function(baseSearchUrl, sortForm, htmlHook, thisPage) {
        //if (SABINETApp.consoleOK) {console.info("fetchSortResponse() parameters:\n1. url: " + baseSearchUrl + "\n2. hook: " + htmlHook + "\n3. form: " + sortForm.attr("id"));}
        var newSource = "",
            sources = ["ResearchPublicationContent", "MagazineContent"];

        thisPage.addClass("cursorWait");

        // Check the htmlHook to determine the source to search in...
        switch (htmlHook) {
        case "#rpc_conceptcontent":
            newSource = sources[0];
            break;
        case "#ptol_conceptcontent":
            newSource = sources[1];
            break;
        default:
            newSource = sources[0];
            break;
        }

        // If there is an option912, adjust the value912
        if (sortForm.find("input[name=option912]").length) {
            if (sortForm.find("input[name=value912]").length) {
                sortForm.find("input[name=value912]").val(newSource);
            } else {
                sortForm.append("<input type='hidden' name='value912' value='" + newSource + "' />");
            }
        }

        if (sortForm.find("input[name=page]").length) {
            sortForm.find("input[name=page]").val("1");
        } else {
            sortForm.append("<input type='hidden' name='page' value='1' />");
        }

        $.ajax({
            type: "POST",
            url: baseSearchUrl,
            data: sortForm.serialize(),
            dataType: "text",
            success: function(resp, statusText) {
            	
                if (resp !== null) {
                    $(htmlHook).get(0).innerHTML = resp;              
                   
                    MathJax.Hub.Queue(["Typeset", MathJax.Hub, $(htmlHook).get(0)]);
                    alert('I got ere 2!');
                    $.cachedScript("/js/" + ingentaCMSApp.instanceprefix + "/ecommerceicons.js");
                    $.cachedScript("/js/" + ingentaCMSApp.instanceprefix + "/search_results_ecommerceicons.js");
                }

            },
            error: function(req, statusText, message) {
            },
            complete: function(req, statusText) {
                $(htmlHook).prev(".resultsloading").remove();
                if (thisPage !== null) {
                    SABINETsr.updateAddToFavouritesLinks(htmlHook);
                    thisPage.removeClass("cursorWait");
                }
                
              //show explanation text above refine search box
                if($('#researchpublicationscontent').hasClass('active') || $('#physicstodaycontent').hasClass('active')){
                	$('.searchExplanation').html("").html($('.explanationText')).slideDown(); //add text
                } else {
                	$('.explanationText').html("");
                	$('.searchExplanation').hide();
                }
                
            }
        });
    },
    /**
     * As the name suggests...sorts the results in date order (NEWest | OLDest)
     *
     * @param {jQuery object}   jQuery event
     * @param {string}          NEW|OLD
     */
    sortByDate: function(e, dateDirection) {
        var here = $(e.target),
            htmlHook = "",
            inputVal = (dateDirection === "NEW" ? "true" : "false"),
            newUrl = "",
            reArray = [ /notused/g, /&sortDescending=(true|false)/, /&sortField=[^&]*/ ],
            searchUrl = $(hiddenUrlName).text(),
            sortForm =  $('#sortForm'),
            sortOpt = "&sortField=prism_publicationDate";
        
        e.preventDefault();
        if (sortForm.find("input[name=sortDescending]").length) {
            sortForm.find("input[name=sortDescending]").val(inputVal);
        } else {
            sortForm.append("<input type='hidden' name='sortDescending' value='" + inputVal + "' />");
        }
        
        newUrl = reArray[1].test(searchUrl) ? searchUrl.replace(reArray[1], "&sortDescending=" + inputVal) : searchUrl + "&sortDescending=" + inputVal;
        searchUrl = reArray[2].test(newUrl) ? newUrl.replace(reArray[2], sortOpt) : newUrl + sortOpt;

        $(hiddenUrlName).text(searchUrl);
       
        // KLOC : Change in the way the htmlHook container is found as this does not work in all cases on the 
        // new base mobile responsive site - i dont know what templates have changed to cause this error but there are
        // multiple forms on the page with the sortFrom id so this method is not ideal anyway.
        
        // htmlHook = "#" + sortForm.closest("div.sourceResultsContainer").attr("id");
        
        // 1 - get the correctSortForm (the values grabbed above from #sortForm may need altering too?
        var correctSortForm = $(e.target).closest("#sortForm");
   
        // 2 - find closest sourceresults container to the tabContent and get its id
        htmlHook = "#" + correctSortForm.closest("div.sourceResultsContainer").attr("id");
        
        // 3 - if new way does not work for whatever reason then default to what it was doing.
        if(htmlHook == "#undefined")
        {
        	htmlHook = "#" + sortForm.closest("div.sourceResultsContainer").attr("id");
        }
        
        if (sortForm.find("input[name=sortField]").length) {
            sortForm.find("input[name=sortField]").val("prism_publicationDate");
        } else {
            sortForm.append("<input type='hidden' name='sortField' value='prism_publicationDate' />");
        }
        
        SABINETsr.fetchSortResponse(baseSearchUrl, sortForm, htmlHook, thisPage);
    },

    /**
     * Sort Newest function: sorts the results in descending order of date
     *
     * @param {jQuery object}   jQuery event
     */
    sortNewest: function(e) {
        var here = $(e.target),
            newClass = "sortRequested";
        if (!here.hasClass(newClass)) {
            here.addClass(newClass);
            SABINETsr.sortByDate(e, "NEW");
        }
    },

    /**
     * Sort oldest function: sorts the results in ascending order of date
     *
     * @param {jQuery object}   jQuery event
     */
    sortOldest: function(e) {
        var here = $(e.target),
            newClass = "sortRequested";
        if (!here.hasClass(newClass)) {
            here.addClass(newClass);
            SABINETsr.sortByDate(e, "OLD");
        }
    },
    /**
     * Creates basic search URL and fetches the inital results for topic homepage
     */
    processConceptId: function() {
        var conceptSearchUrl;
        
        hiddenUrlName = "#rpc_hiddensearchurl";
        conceptSearchUrl = searchUrlPt1 + $("#conceptid").text() + searchUrlPt2a + searchUrlPt3 + searchUrlPt4;
        //console.log(conceptSearchUrl);
        SABINETsr.fetchAhahPage(conceptSearchUrl, "#researchpublicationsconceptcontent", null);
    },

    /**
     * Gets the Research Publications tab contents
     * Note: makes sure the value912 for context to ResearchPublicationContent
     */
    processResearchPublicationTab: function(e) {
        var newUrl,
            searchUrl;
        $('.searchFilterContainer').show();
        $('#hiddenrefinedsearchurl').text("");
        // Update the hiddensearchurl
        hiddenUrlName = "#rpc_hiddensearchurl";
        searchUrl = $(hiddenUrlName).text();
        newUrl = searchUrl.replace(/&value912=[^&]*/, "&value912=ResearchPublicationContent");
        $(hiddenUrlName).text(newUrl);
        SABINETsr.fetchAhahPage(newUrl, "#researchpublicationsconceptcontent", null);
        
    },
    /**
     * Gets the contents for physics today tab
     * Note: uses basic search URL and swaps the value912 for context to MagazineContent
     */
    processPhysicsTodayTab: function(e) {
        var conceptSearchUrl,
            newUrl,
            searchUrl;
        $('.searchFilterContainer').show();
        $('#hiddenrefinedsearchurl').text("");
        //$('#researchpublicationsconceptcontent').html("");

        if ($("#conceptid").length > 0) {
            conceptSearchUrl = searchUrlPt1 + $("#conceptid").text() + searchUrlPt2b + searchUrlPt3 + searchUrlPt4;

            hiddenUrlName = "#ptol_hiddensearchurl";
            SABINETsr.fetchAhahPage(conceptSearchUrl, "#physicstodayconceptcontent", null);
            // Update the hiddensearchurl
            searchUrl = $(hiddenUrlName).text();
            newUrl = searchUrl.replace(/&value912=[^&]*/, "&value912=MagazineContent");
            $(hiddenUrlName).text(newUrl);
        }
        
    },
    /**
     * retrieves results for Authors tab
     */
    processAuthorsTab: function(e) {
        var conceptSearchUrl;
        $('.searchFilterContainer').hide();
        $('.searchExplanation').text("");
        if ($("#conceptid").length > 0) {
            hiddenUrlName = "#hiddensearchurl";
            conceptSearchUrl = searchUrlPt1 + $("#conceptid").text() + searchUrlPt2c + searchUrlPt3;
            SABINETsr.fetchAhahPage(conceptSearchUrl, "#conceptbyauthorcontent", null);
        }
    }
} //end function definitions


	    
   /**
     * Click handler for refined search on ahah page / topic page
     * When go is clicked make sure a term is entered
     ** UC 1: Empty, prompt user by  focusing on input
     **	UC 2: Not Empty, Begin refined search			  
     * 			- Remove term
     * 			- Show return to full search results link
     * 			- Create hidden refined search url
     * */
    $("#searchrefineform.lnk_topic").submit(function(e){
    	e.preventDefault();
    	if($('#searchrefineform input[type="text"]').val() === "Refine your search" || $('#searchrefineform input[type="text"]').val() === ''){	    	
    		$('#searchrefineform input[type="text"]').focus();
    	} else{    		
	    	//update ahah query and fetch results
	    	SABINETsr.processRefinedSearchAhah();
	    	//set up url for return to results
	    	$('.searchRefineReturn a').click(function(e){
	    		e.preventDefault();
	    		//get concept url, fetch via ahah
	    	});
	    }
    	return false;
    });

    /**
     * Hide refinement options on authors tab
     */
    if($('#authorsforconceptcontent').hasClass('active')){
		$('.searchFilterContainer').hide();
	} else {
		$('.searchFilterContainer').show();
	}
       
    /*
     * return to search results handler
     */
    $('.searchRefineReturn a').click(function(e){  	   	
    	//what tab is active? replace this when fetching via ahah
    	if($('#researchpublicationscontent').hasClass('active')){
    		SABINETsr.processResearchPublicationTab(e);
    	} else if($('#physicstodaycontent').hasClass('active')){
    		SABINETsr.processPhysicsTodayTab(e);
    	}
    });
    

    $(document).on("click", ".paginator a, .perpageoptions a",function(e) {
        var here = $(this),
            htmlHook,
            thisHref = "";
        e.preventDefault();
        if (!here.hasClass("executed")) {
            here.addClass("executed");
            // Kill off existing function to prevent endless addition...
            $(document).off("click", here)
            thisPage.addClass("cursorWait");
            thisHref = this.href;
            htmlHook = "#" + here.closest(".tabbedsection").find("div").first().attr("id");
            SABINETsr.fetchAhahPage(thisHref, htmlHook, thisPage);
        }
    });

    

    /*
     * More sorting click handlers
     */
    $(document).on("click", "#sortOldest", SABINETsr.sortOldest);
    $(document).on("click", "#sortNewest", SABINETsr.sortNewest);

    /*
     * Click handler for viewing refined results from facet click
     * -facet url is already configured, it is grabbed and used to fetch new page
     * -the get variable page is set back to 1 so user is brought to first page of results
     * 	(^applies only if page variable was already set)
     */
    $(document).on("click", ".sourceResultsContainer .facetitem a", function(e) {
        var here = $(this),
            url = here.attr("href"),
            hook = "#" + here.closest(".sourceResultsContainer").attr("id"),
            newUrl = "",
            re1 = /&page=\d+/;
        e.preventDefault();
        thisPage.addClass("cursorWait");
        newUrl = (url.indexOf("&page=") === -1) ? url + "&page=1" : url.replace(re1, "&page=1");
        SABINETsr.fetchAhahPage(newUrl, hook, thisPage);
    });

    /*
     * Click handler to return to view all facets in a section after selecting one
     * -User wants to return via "Any {facet} type" link
     * 		* the url for that link is stored
     * 		* the original search url is broken into params
     * 		* ^I think to remove old facet name and option
     * 		* a new query string is set up and it is used to fetch the new results 
     */
    $(document).on("click", ".anysearchfacetlink", function(e) {
        var here = $(this),
            addedToNewParams,
            facetNames = "",
            facetNames_split,
            facetOptions,
            facetOptions_split,
            hook,
            i,
            indices,
            indices_split,
            j,
            name_value_split,
            newFacetNames,
            newFacetOptions,
            newParams,
            newUrl,
            options,
            options_split,
            origUrl,
            param_split,
            theFacet;
        
        e.preventDefault();
        hook = "#" + here.closest(".sourceResultsContainer").attr("id");
        thisPage.addClass("cursorWait");
        theFacet = here.attr("href");
        origUrl = $(hiddenUrlName).text();
        //param_split = origUrl.substring(1).split("&");
        param_split = origUrl.split("&");

        for (i = 0; i < param_split.length; i++) {
            name_value_split = param_split[i].split("=");
            if (name_value_split[0] === "facetNames") {
                facetNames = name_value_split[1];
            }
            if (name_value_split[0] === "facetOptions") {
                facetOptions = name_value_split[1];
            }
        }
        indices = "";
        facetNames_split = facetNames.split("+");
        facetOptions_split = facetOptions.split("+");
        newFacetNames = "";
        newFacetOptions = "";
        if (facetNames_split == facetNames) {
            facetNames_split = facetNames.split(" ");
            facetOptions_split = facetOptions.split(" ");
        }
        for (i = 0; i < facetNames_split.length; i++) {
            if (facetNames_split[i] === theFacet) {
                indices = ((indices === "") ? i : indices + "," + i) + "";
            } else {
                newFacetNames   = ((newFacetNames === "") ? facetNames_split[i]   : newFacetNames   + "+" + facetNames_split[i])   + "";
                newFacetOptions = ((newFacetNames === "") ? facetOptions_split[i] : newFacetOptions + "+" + facetOptions_split[i]) + "";
            }
        }
        options = "";
        indices_split = indices.split(",");
        for (i = 0; i < indices_split.length; i++) {
            options = ((options === "") ? facetOptions_split[indices_split[i]] : options + "," + facetOptions_split[indices_split[i]]) + "";
        }
        newParams = "";
        addedToNewParams = false;
        options_split = options.split(",");
        for (i = 0; i < param_split.length; i++) {
            name_value_split = param_split[i].split("=");
            addedToNewParams = false;
            for (j = 0; j < options_split.length; j++) {
                if ((name_value_split[0] === ("option" + options_split[j])) || (name_value_split[0] === ("value" + options_split[j])) || (name_value_split[0] === ("operator" + options_split[j]))) {
                    newParams = ((newParams === "") ? name_value_split[0] + "=" : newParams + "&" + name_value_split[0] + "=") + "";
                    addedToNewParams = true;
                }
            }
            if (!addedToNewParams) {
                if (name_value_split[0] === "facetNames") {
                    if (newFacetNames !== "") {
                        newParams = ((newParams === "") ? name_value_split[0] + "=" + newFacetNames : newParams + "&" + name_value_split[0] + "=" + newFacetNames) + "";
                    }
                } else if (name_value_split[0] === "facetOptions") {
                    if (newFacetOptions !== "") {
                        newParams = ((newParams === "") ? name_value_split[0] + "=" + newFacetOptions : newParams + "&" + name_value_split[0] + "=" + newFacetOptions) + "";
                    }
                } else {
                    newParams = ((newParams === "") ? param_split[i] : newParams + "&" + param_split[i]) + "";
                }
            }

        }
        newUrl = newParams;
        SABINETsr.fetchAhahPage(newUrl, hook, thisPage, "REMOVE");
    });

    /*
     * Click handlers to get tab contents
     * 
     */
    if ($("#conceptid").length > 0) {
        SABINETsr.processConceptId();
    }
    $("#researchpublicationscontent").click(function(e) {       
    	SABINETsr.processResearchPublicationTab(e);  	
    });
    $("#physicstodaycontent").click(function(e) {
        SABINETsr.processPhysicsTodayTab(e);
    });
    $("#authorsforconceptcontent").click(function(e) {
        SABINETsr.processAuthorsTab(e);
    });

    
    // Only present on Contributor and Institution pages...
    if ($("#contributionsIds").length > 0) {
        if ($("#contributionsIds").text() !== "") {
            var data = {
                    "option1": "webId",
                    "value1": $("#contributionsIds").text(),
                    "fmt": "ahah",
                    "from": "concepthomepage",
                    "noRedirect": "true",
                    "sortDescending":"true",
                    "sortField":"prism_publicationDate"
                },
                hiddenSearchUrl = $.param(data),
                htmlHook = "#contributedArticleContent";

            if ($(hiddenUrlName).length > 0) {
                $(hiddenUrlName).text(hiddenSearchUrl);
            }

            var url = baseSearchUrl;
            $.ajax({
                type: "POST",
                data: data,
                url: url,
                dataType: "text",
                success: function(resp, statusText) {
                    $(".contributedArticlesLoading").remove();
                    if (resp !== null) {
                        $(htmlHook).get(0).innerHTML = resp;
                        SABINETsr.updateAddToFavouritesLinks(htmlHook);
                        MathJax.Hub.Queue(["Typeset", MathJax.Hub, $(htmlHook).get(0)]);
                        $.cachedScript("/js/" + ingentaCMSApp.instanceprefix + "/ecommerceicons.js");
                        alert('I got ere 3!');
                        $.cachedScript("/js/" + ingentaCMSApp.instanceprefix + "/search_results_ecommerceicons.js");
                    }
                },
                error: function(req, statusText, message) {
                    $(".contributedArticlesLoading").remove();
                }
            });
        } else {
            $(".contributedArticlesLoading").remove();
        }
    } else {
        $(".contributedArticlesLoading").remove();
    }
    
    $( document ).on("click",".addToFavouritesButton", function(e) {
        var event,
            statsUrl;

        e.preventDefault();
        $(this).parents(".favouritesForm").submit();
        event = $(".favouritestatsevent").html();
        statsUrl = hiddenContext + "/statslogredirect";
        if (event !== null) {
            $.post(statsUrl, {statsLogContents:event});
        }
    });

    $(".minus").hide();

    $(document).on("click", ".conceptspart .plus", function() {
        var here = $(this);
        here.siblings(".minus").show();
        here.hide();
        here.closest(".conceptspart").find(".hiddenConcept").show();
    });

    $(document).on("click", ".conceptspart .minus", function() {
        var here = $(this);
        here.siblings(".plus").show();
        here.hide();
        here.closest(".conceptspart").find(".hiddenConcept").hide();
    });    
    return false;
}); //end document.ready


