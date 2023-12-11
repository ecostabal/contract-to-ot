const axios = require('axios');

// Apikey
const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjIzMjg3MzUyNCwiYWFpIjoxMSwidWlkIjoyMzUzNzM2NCwiaWFkIjoiMjAyMy0wMS0zMVQyMTowMjoxNy4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6OTUwNzUxNiwicmduIjoidXNlMSJ9.lX1RYu90B2JcH0QxITaF8ymd4d6dBes0FJHPI1mzSRE'; // Reemplaza 'TU_API_KEY' con tu clave de API de Monday.com

// Función para obtener los datos de un ítem en Monday.com
async function getMondayItemData(itemId) {
    try {
        const query = `query { items(ids: [${itemId}]) { column_values { id text type value } subitems { column_values { id text } } } }`;
        const response = await axios.post('https://api.monday.com/v2', { query }, { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } });

        if (response.data && response.data.data && response.data.data.items && response.data.data.items.length > 0) {
            const itemData = response.data.data.items[0];
            console.log('Datos del item y subitems obtenidos con éxito:', itemData);

            // Aquí tienes acceso tanto a las columnas del ítem como a sus subelementos
            const columnsData = itemData.column_values;
            const subitemsData = itemData.subitems;

            // Ahora puedes imprimir y retornar ambos, columnas y subelementos
            console.log('Columnas del Item:', columnsData);
            console.log('Subelementos:', subitemsData);

            return { columnsData, subitemsData };
        } else {
            throw new Error('Estructura de respuesta inesperada o sin datos');
        }
    } catch (error) {
        console.error('Error al obtener datos del item:', error);
        throw error;
    }
}

// Función para crear un nuevo item en otro board.
async function createNewItemInOtherBoard(boardId, itemName, columnValues) {
    try {
        // 1. Crear el ítem
        const createMutation = `mutation {
            create_item(board_id: ${boardId}, item_name: "${itemName}", column_values: "${JSON.stringify(columnValues).replace(/"/g, '\\"')}") {
                id
            }
        }`;

        const createResponse = await axios.post('https://api.monday.com/v2', { query: createMutation }, { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } });
        const newItemId = createResponse.data.data.create_item.id;

        // 2. Actualizar la columna de ubicación con formattedLocation
        const updateMutation = `mutation {
            change_multiple_column_values(item_id: ${newItemId}, board_id: ${boardId}, column_values: "{\"location\": \"${formattedLocation}\"}") {
                id
            }
        }`;

        await axios.post('https://api.monday.com/v2', { query: updateMutation }, { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } });

        console.log('Nuevo item creado y actualizado con éxito');
        return newItemId;
    } catch (error) {
        console.error('Error al crear o actualizar un nuevo item:', error);
        throw error;
    }
}

// Función para procesar subelementos y crear nuevos ítems
async function processSubElements(itemId) {
    try {
        console.log('Iniciando procesamiento de subelementos para el item:', itemId);

        const itemData = await getMondayItemData(itemId);

        if (!itemData || !itemData.column_values) {
            console.error('No se encontraron datos de columnas para el item con ID:', itemId);
            return;
        }

        const { column_values: columnsData, subitems } = itemData;

        // Extraer y formatear la ubicación

        let formattedLocation = ""; // Variable para almacenar la ubicación formateada

        const locationColumn = columnsData.find(cv => cv.id === "ubicaci_n");
        if (locationColumn && locationColumn.value) {
            try {
                const locationData = JSON.parse(locationColumn.value);
                if (locationData && 'lat' in locationData && 'lng' in locationData) {
                    // Formatear la ubicación como una cadena de texto simple
                    formattedLocation = `${locationData.lat} ${locationData.lng}`;
                    if (locationData.address) {
                        formattedLocation += ` ${locationData.address}`;
                    }
                }
            } catch (error) {
                console.error('Error al analizar los datos de ubicación:', error);
            }
        }


        if (!subitems || subitems.length === 0) {
            console.log('No hay subelementos que procesar para este item.');
            return;
        }

        for (const subitem of subitems) {
            const subitemColumns = subitem.column_values;
            const tipoFirmanteColumn = subitemColumns.find(column => column.id === 'reflejo_189');

            if (tipoFirmanteColumn && (tipoFirmanteColumn.text === 'Arrendador' || tipoFirmanteColumn.text === 'Arrendatario')) {
                // Datos subitem
                const nombre = subitemColumns.find(column => column.id === 'reflejo0')?.text || '';
                const apellido = subitemColumns.find(column => column.id === 'reflejo')?.text || '';
                const rut = subitemColumns.find(column => column.id === 'reflejo_1')?.text || '';
                const telefono = subitemColumns.find(column => column.id === 'reflejo_2')?.text || '';
                const correo = subitemColumns.find(column => column.id === 'reflejo_3')?.text || '';
                const tipoFirmante = tipoFirmanteColumn.text;

                // Datos item
                const tipoContrato = columnsData.estado_1?.text || '';
                const tipoPropiedad = columnsData.estado_17?.text || '';
                const numeroUnidad = columnsData.texto?.text || '';
                const estacionamientos = columnsData.texto4?.text || '';
                const bodegas = columnsData.texto2?.text || '';
                const valorArriendo = columnsData.n_meros?.text || '';
                const gastoNotarial = columnsData.n_meros5?.text || '';

                const nombreCompleto = `${nombre} ${apellido}`;

                // Crear el nombre del nuevo item
                const nuevoItemNombre = `OT - ${nombreCompleto}`;

                // Crear nuevo item con datos específicos
                const newItemData = {
                    estado8: tipoContrato,
                    estado: tipoPropiedad,
                    ubicaci_n: formattedLocation,
                    texto9: numeroUnidad,
                    texto5: estacionamientos,
                    texto95: bodegas,
                    n_meros: valorArriendo,
                    n_meros9: gastoNotarial,
                    texto6: nombreCompleto,
                    texto: nombre,
                    texto4: apellido,
                    texto3: rut,
                    tel_fono: telefono,
                    correo_electr_nico: correo,
                    // Agrega aquí más campos necesarios
                };

                // Crear el nuevo item en el otro tablero con el nombre personalizado
                await createNewItemInOtherBoard(5598495616, nuevoItemNombre, newItemData);
                console.log('Subelemento procesado con éxito:', tipoFirmante);
            }
        }
    } catch (error) {
        console.error('Error al procesar subelementos:', error);
        throw error;
    }
}

exports.contractToOt = async (req, res) => {
    try {
        console.log("Inicio de la función");

        if (!req.body || !req.body.event || !req.body.event.pulseId) {
            throw new Error('La solicitud no contiene la estructura esperada de un evento de Monday.com');
        }

        const itemId = req.body.event.pulseId;
        await processSubElements(itemId);
        res.status(200).send("Items procesados y nuevos items creados correctamente");
    } catch (error) {
        console.error("Error en la función principal:", error.message);
        res.status(500).send("Error procesando el evento de Monday.com");
    }
};
