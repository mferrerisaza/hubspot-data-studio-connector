function getAuthType() {
  const response = { type: 'NONE' };
  return response;
}

function getConfig() {
  var cc = DataStudioApp.createCommunityConnector();
  var config = cc.getConfig();

  config.newInfo()
    .setId('instructions')
    .setText('Ingresa el API key');

  config.newTextInput()
    .setId('hapikey')
    .setName('Ingresa el API key de tu cuenta de Hubspot')

  return config.build();
}

function getFields(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;

  fields.newMetric()
    .setId('dealId')
    .setName('Deal ID')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newDimension()
    .setId('dealname')
    .setName('Deal Name')
    .setType(types.TEXT);

  fields.newDimension()
    .setId('producto')
    .setName('Producto')
    .setType(types.TEXT);

  fields.newDimension()
    .setId('dealstage')
    .setName('Deal Stage')
    .setType(types.TEXT);

  fields.newDimension()
    .setId('fecha_inicio_reserva')
    .setName('Fecha Inicio Reserva')
    .setType(types.YEAR_MONTH_DAY_HOUR);

  fields.newDimension()
    .setId('fecha_fin_reserva')
    .setName('Fecha Fin Reserva')
    .setType(types.YEAR_MONTH_DAY_HOUR);

  fields.newDimension()
    .setId('n_mero_de_d_as')
    .setName('Número de días')
    .setType(types.NUMBER);

  fields.newDimension()
    .setId('monto_total')
    .setName('Monto de la reserva')
    .setType(types.CURRENCY_COP);

  fields.newDimension()
    .setId('createdate')
    .setName('Create Date')
    .setType(types.YEAR_MONTH_DAY_HOUR);

  return fields;
}

function getSchema(request) {
  var fields = getFields(request).build();
  return { schema: fields };
}

function convertDealStageToOurTerms(dealstage) {
  switch (dealstage) {
    case 'appointmentscheduled':
      return "Cotización";
    case 'contractsent':
      return "Información Enviada";
    case 'qualifiedtobuy':
      return "Reserva";
    case 'closedwon':
      return "Venta";
    case 'closedlost':
      return "Venta Perdida";
  }
}


function responseToRows(requestedFields, response, packageName) {
  return response.map(function(deal) {
    var row = [];
    requestedFields.asArray().forEach(function (field) {
      console.log(deal.dealId)
      switch (field.getId()) {
        case 'dealId':
          return row.push(deal.dealId);
        case 'dealname':
          return row.push(deal.properties.dealname.value);
        case 'producto':
          return row.push(deal.properties.producto.value);
        case 'dealstage':
          return row.push(convertDealStageToOurTerms(deal.properties.dealstage.value));
        case 'fecha_inicio_reserva':
          return row.push(new Date(deal.properties.fecha_inicio_reserva.timestamp));
        case 'fecha_fin_reserva':
          return row.push(new Date(deal.properties.fecha_fin_reserva.timestamp));
        case 'n_mero_de_d_as':
          return row.push(parseInt(deal.properties.n_mero_de_d_as.value, 10));
        case 'monto_total':
          return row.push(parseInt(deal.properties.monto_total.value, 10));
        case 'createdate':
          return row.push(new Date(deal.properties.createdate.timestamp));
        default:
          return row.push('');
      }
    });
    return { values: row };
  });
}

function getData(request) {
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  var requestedFields = getFields().forIds(requestedFieldIds);

  const url = ["https://api.hubapi.com/deals/v1/deal/paged?hapikey=",
              request.configParams.hapikey,
              "&includeAssociations=true",
              "&limit=250",
              "&properties=dealname",
              "&properties=producto",
              "&properties=dealstage",
              "&properties=fecha_inicio_reserva",
              "&properties=fecha_fin_reserva",
              "&properties=n_mero_de_d_as",
              "&properties=monto_total",
              "&properties=createdate"];

  const returnedDeals = [];
  const parsedResponse = getDeals(url.join(""), returnedDeals);

  var rows = responseToRows(requestedFields, parsedResponse);

  return {
    schema: requestedFields.build(),
    rows: rows
  };
}


function getDeals(url, returnedDeals, offset) {
    if (typeof offset == 'undefined') {
        offsetParam = null;
    } else {
        offsetParam = "&offset=" + offset;
    }

    const finalUrl = url + offsetParam

    var response = UrlFetchApp.fetch(finalUrl);
    const parsedBody = JSON.parse(response)

    for (var i = 0; i < parsedBody.deals.length; i++) {
      returnedDeals.push(parsedBody.deals[i]);
    }

    if (parsedBody['hasMore']) {
      getDeals(url, returnedDeals, parsedBody['offset'])
    }

    return returnedDeals
};

function isAdminUser() {
  return true;
}
