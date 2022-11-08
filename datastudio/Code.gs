var cc = DataStudioApp.createCommunityConnector();
var DEFAULT_URL = 'https://app.opentracker.net/api/metrics/query';

// https://developers.google.com/datastudio/connector/reference#getauthtype
function getAuthType() {
  var AuthTypes = cc.AuthType;
  return cc
    .newAuthTypeResponse()
    .setAuthType(AuthTypes.NONE)
    .build();
}

// [START get_config]
// https://developers.google.com/datastudio/connector/reference#getconfig
function getConfig() {
  var config = cc.getConfig();

  config
    .newInfo()
    .setId('instructions')
    .setText(
      'Please ensure you have registration a site with Opentracker before continue of the following'
    );

  config
    .newTextInput()
    .setId('url')
    .setName(
      'Please enter a valid API URL'
    )
    .setHelpText('You can get the example API from OT4 widget')
    .setPlaceholder(DEFAULT_URL)
    .setAllowOverride(true);

  // https://developers.google.com/apps-script/reference/data-studio/config#setDateRangeRequired(Boolean)
  config.setDateRangeRequired(true);

  return config.build();
}
// [END get_config]


function updateURLParameter(url, param, paramVal) {
    var newAdditionalURL = "";
    var tempArray = url.split("?");
    var baseURL = tempArray[0];
    var additionalURL = tempArray[1];
    var temp = "";
    if (additionalURL) {
        tempArray = additionalURL.split("&");
        for (var i=0; i<tempArray.length; i++){
            if(tempArray[i].split('=')[0] != param){
                newAdditionalURL += temp + tempArray[i];
                temp = "&";
            }
        }
    }

    var rows_txt = temp + "" + param + "=" + paramVal;
    return baseURL + "?" + newAdditionalURL + rows_txt;
}

const replace = (text, key, value) => text.replace(new RegExp(key, "g"), value);
const uppercase = (text) => text.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const isNumeric = (n) => !isNaN(parseFloat(n)) && isFinite(n);

function getFields(response) {

  var jResponse = JSON.parse(response);

  //let field_names = Object.keys(jResponse.buckets[0]);
  let field_names = [];
  for (let i = 0; i < jResponse.buckets.length; i++) {
    let part_field_names = Object.keys(jResponse.buckets[i]);
    for (let j = 0; j < part_field_names.length; j++) {
      if (!field_names.includes(part_field_names[j]))
         field_names.push(part_field_names[j]);
    }
  }

  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;

  // https://stackoverflow.com/questions/58626103/converting-unix-timestamp-in-google-app-scripts
  // https://developers.google.com/apps-script/reference/data-studio/field-type
  // Utilities.formatDate()
  // Year, month, day, hour, minute, and second in the format of YYYYMMDDHHmmss such as 20170317023017.


  for (var i = 0; i < field_names.length; i++) {
    let v = uppercase(replace(field_names[i], "_", " "));
    //console.log(field_names[i] +"="+ v);

    let v_is_numeric = isNumeric(jResponse.buckets[0][field_names[i]]);

    if (v_is_numeric) {
      if (field_names[i] === 'eventUnixTimestamp' || field_names[i] === 'eventEsTimestamp') {
        fields.newDimension()
        .setId(replace(field_names[i], " ", "_"))
        .setName(v)
        .setType(types.YEAR_MONTH_DAY_SECOND);
      } else {
        fields.newMetric()
        .setId(replace(field_names[i], " ", "_"))
        .setName(v)
        .setType(types.NUMBER);
      }
    } else {
      if (field_names[i] === 'Timestamp') {
        fields.newDimension()
        .setId(replace(field_names[i], " ", "_"))
        .setName(v)
        .setType(types.YEAR_MONTH_DAY_SECOND);
      } else {
        fields.newDimension()
        .setId(replace(field_names[i], " ", "_"))
        .setName(v)
        .setType(types.TEXT);
      }
    }

  }

  return fields;
}

// https://developers.google.com/datastudio/connector/reference#getschema
function getSchema(request) {
  let url = DEFAULT_URL;
  if (request.configParams?.url)
      url = request.configParams?.url

  // only get a row is enough becuase just interest on the key field
  /*
  var newURL = updateURLParameter(url, 'size', 1);
  url = newURL;
  */

  var response = UrlFetchApp.fetch(url);
  var jResponse = JSON.parse(response);
  //let field_names = Object.keys(jResponse.buckets[0]);

  return {schema: getFields(response).build()};
}
// [END get_schema]

// [START get_data]
// https://developers.google.com/datastudio/connector/reference#getdata
function getData(request) {
  request.configParams = validateConfig(request.configParams);

  let url = DEFAULT_URL;
  if (request.configParams?.url)
      url = request.configParams?.url

  if (request.dateRange?.startDate) {
    var sMilliUnixTimestamp = new Date(request.dateRange.startDate).getTime();
    var eMilliUnixTimestamp = new Date(request.dateRange.endDate).getTime();
    var newURL = updateURLParameter(url, 'startTime', sMilliUnixTimestamp);
    newURL = updateURLParameter(newURL, 'endTime', eMilliUnixTimestamp);
    console.log("newURL=" + newURL);
    url = newURL;
  }
  
  var response = UrlFetchApp.fetch(url);

  var requestedFields = getFields(response).forIds(
    request.fields.map(function(field) {
      return field.name;
    })
  );

  try {
    var normalizedResponse = normalizeResponse(request, response);
    var data = getFormattedData(normalizedResponse, requestedFields);
  } catch (e) {
    cc.newUserError()
      .setDebugText('Error fetching data from API. Exception details: ' + e)
      .setText(
        'The connector has encountered an unrecoverable error. Please try again later, or file an issue if this error persists.'
      )
      .throwException();
  }

  return {
    schema: requestedFields.build(),
    rows: data
  };
}

/**
 * Gets response for UrlFetchApp.
 *
 * @param {Object} request Data request parameters.
 * @returns {string} Response text for UrlFetchApp.
 */
function fetchDataFromApi(request) {
  /*
  var url = [
    'https://api.npmjs.org/downloads/range/',
    request.dateRange.startDate,
    ':',
    request.dateRange.endDate,
    '/',
    request.configParams.package
  ].join('');
  */
  var url = DEFAULT_URL;
  var response = UrlFetchApp.fetch(url);
  return response;
}

/**
 * Parses response string into an object.
 *
 * @param {Object} request Data request parameters.
 * @param {string} responseString Response from the API.
 * @return {Object} contain array of key values pair.
 */
function normalizeResponse(request, responseString) {
  var response = JSON.parse(responseString);
  var mapped_response = {};

  /*
  var package_list = request.configParams.package.split(',');
  

  if (package_list.length == 1) {
    mapped_response[package_list[0]] = response;
  } else {
    mapped_response = response;
  }
  */

  mapped_response = response.buckets;

  return mapped_response;
}

/**
 * Formats the parsed response from external data source into correct tabular
 * format and returns only the requestedFields
 *
 * @param {Array} response The response array from external data source.
 * @param {Array} requestedFields The fields requested in the getData request.
 * @returns {Array} Array containing rows of data in key-value pairs for each
 *     field.
 */
function getFormattedData(response, requestedFields) {

  var data = [];
  response.map(function(row) {
    //console.log(row);
      
    let d = formatData(requestedFields, row);
    data = data.concat(d);
  });

  return data;
}
// [END get_data]

// https://developers.google.com/datastudio/connector/reference#isadminuser
function isAdminUser() {
  return true;
}

/**
 * Validates config parameters and provides missing values.
 *
 * @param {Object} configParams Config parameters from `request`.
 * @returns {Object} Updated Config parameters.
 */
function validateConfig(configParams) {
  configParams = configParams || {};
  configParams.package = configParams.package || DEFAULT_URL;

  configParams.package = configParams.package
    .split(',')
    .map(function(x) {
      return x.trim();
    })
    .join(',');

  return configParams;
}

/**
 * Formats a single row of data into the required format.
 *
 * @param {Object} requestedFields Fields requested in the getData request.
 * @param {string} fieldName Name of the field
 * @param {Object} jsonRow Contains the download data for a row.
 * @returns {Object} Contains values for requested fields in predefined format.
 */
function formatData(requestedFields, jsonRow) {
  var row = requestedFields.asArray().map(function(requestedField) {
    switch (requestedField.getId()) {
      /*
      case 'day':
        return jsonRow.day.replace(/-/g, '');
      case 'downloads':
        return jsonRow.downloads;
      */
      case 'event_id':
        return jsonRow.event_id;
      case 'total_number_visits':
        return parseInt(jsonRow.total_number_visits);
      case 'eventUnixTimestamp':
        //return new Date(parseInt(jsonRow.eventUnixTimestamp));
        
        /*
        let d1 = Math.floor(parseInt(jsonRow.eventUnixTimestamp) / 1000);
        console.log(d1);
        */
        let d1 = new Date(parseInt(jsonRow.eventUnixTimestamp));
        var formattedDate = Utilities.formatDate(d1, "UTC", "YYYYMMDDHHmmss");
        return formattedDate;
        
      case 'eventEsTimestamp':
        //return new Date(parseInt(jsonRow.eventEsTimestamp));
        
        let d = new Date(parseInt(jsonRow.eventEsTimestamp));
        var formattedDate = Utilities.formatDate(d, "UTC", "YYYYMMDDHHmmss");
        return formattedDate;
      case 'Timestamp':
        var reggie = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
        var dateArray = reggie.exec(jsonRow.Timestamp);
        var dateObject = new Date((+dateArray[1]),
                                  (+dateArray[2])-1, // Careful, month starts at 0!
                                  (+dateArray[3]),
                                  (+dateArray[4]),
                                  (+dateArray[5]),
                                  (+dateArray[6])
        );
        var formattedDate = Utilities.formatDate(dateObject, "UTC", "YYYYMMDDHHmmss");
        return formattedDate;
      default:
        return jsonRow[replace(requestedField.getId(), "_", " ")];
    }
  });

  return {values: row};
}
