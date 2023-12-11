const axios = require('axios');

// Apikey
const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjIzMjg3MzUyNCwiYWFpIjoxMSwidWlkIjoyMzUzNzM2NCwiaWFkIjoiMjAyMy0wMS0zMVQyMTowMjoxNy4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6OTUwNzUxNiwicmduIjoidXNlMSJ9.lX1RYu90B2JcH0QxITaF8ymd4d6dBes0FJHPI1mzSRE'; // Reemplaza 'TU_API_KEY' con tu clave de API de Monday.com

// Función para obtener los datos de un ítem en Monday.com
async function getMondayItemData(itemId) {
    try {
        console.log(`Obteniendo datos del item con ID: ${itemId}`);
        const query = `
        query {
            items(ids: [${itemId}]) {
                column_values {
                    id 
                    text
                }
                subitems {
                    column_values {
                        id
                        text
                    }
                }
            }
        }`;
    
        const response = await axios.post('https://api.monday.com/v2', {
            query: query
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const itemData = response.data.data.items[0];
        console.log('Datos del item y subitems obtenidos con éxito:', itemData);


        // Extraer datos de la columna de ubicación
        const locationColumn = itemData.column_values.find(cv => cv.id === "ubicaci_n");
        let locationData = null;
        if (locationColumn && locationColumn.text) {
            try {
                locationData = JSON.parse(locationColumn.text);
            } catch (error) {
                console.error('Error al analizar los datos de ubicación:', error);
            }
        }
    
        // Aquí tienes acceso tanto a las columnas del ítem como a sus subelementos
        const columnsData = itemData.column_values;
        const subitemsData = itemData.subitems;
    
        // Ahora puedes imprimir y retornar ambos, columnas y subelementos
        console.log('Columnas del Item:', columnsData);
        console.log('Subelementos:', subitemsData);
    
        return { columnsData, subitemsData, locationData };

    } catch (error) {
        console.error('Error al obtener datos del item:', error);
        throw error;
    }
}


// Función para crear un nuevo ítem en otro tablero
async function createNewItemInOtherBoard(boardId, itemName, columnValues) {
    try {
        console.log('Creando un nuevo item en el tablero:', itemName);

        const columnValuesStr = JSON.stringify(columnValues).replace(/"/g, '\\"');

        const mutation = `mutation {
            create_item(board_id: ${boardId}, item_name: "${itemName}", column_values: "${columnValuesStr}") {
                id
            }
        }`;

        const response = await axios.post('https://api.monday.com/v2', {
            query: mutation
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Nuevo item creado con éxito:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error al crear un nuevo item:', error);
        throw error;
    }
}

// Función para procesar subelementos y crear nuevos ítems
async function processSubElements(itemId) {
    try {
        console.log('Iniciando procesamiento de subelementos para el item:', itemId);

        const { columnsData, subitemsData, locationData } = await getMondayItemData(itemId);

        // Dentro de la función processSubElements
        let formattedLocation = "";
        if (locationData && 'lat' in locationData && 'lng' in locationData) {
            // Verifica si los valores de latitud y longitud están dentro de los rangos válidos
            if (locationData.lat > -90 && locationData.lat < 90 && 
                locationData.lng > -180 && locationData.lng <= 180) {
                formattedLocation = `${locationData.lat} ${locationData.lng} ${locationData.address || 'unknown'}`;
            } else {
                console.error('Latitud o longitud fuera de rango.');
            }
        } else {
            console.error('Datos de ubicación incompletos o no disponibles.');
        }

        if (subitemsData.length === 0) {
            console.log('No hay subelementos que procesar para este item.');
            return;
        }

        for (const subitem of subitemsData) {
            const subitemColumns = subitem.column_values;
            const tipoFirmanteColumn = subitemColumns.find(column => column.id === 'reflejo_189');

            if (tipoFirmanteColumn && (tipoFirmanteColumn.text === 'Arrendador' || tipoFirmanteColumn.text === 'Arrendatario')) {
                // Datos subitem
                const nombre = subitemColumns.find(column => column.id === 'reflejo0')?.text;
                const apellido = subitemColumns.find(column => column.id === 'reflejo')?.text;
                const rut = subitemColumns.find(column => column.id === 'reflejo_1')?.text;
                const telefono = subitemColumns.find(column => column.id === 'reflejo_2')?.text;
                const correo = subitemColumns.find(column => column.id === 'reflejo_3')?.text;
                const tipoFirmante = subitemColumns.find(column => column.id === 'reflejo_189')?.text;

                // Datos item
                const tipoContrato = columnsData.find(column => column.id === 'estado_1')?.text;
                const tipoPropiedad = columnsData.find(column => column.id === 'estado_17')?.text;
                const direccion = columnsData.find(column => column.id === 'ubicaci_n')?.text;
                const numeroUnidad = columnsData.find(column => column.id === 'texto')?.text;
                const estacionamientos = columnsData.find(column => column.id === 'texto4')?.text;
                const bodegas = columnsData.find(column => column.id === 'texto2')?.text;
                const valorArriendo = columnsData.find(column => column.id === 'n_meros')?.text;
                const gastoNotarial = columnsData.find(column => column.id === 'n_meros5')?.text;


                const nombreCompleto = nombre + ' ' + apellido;

                // Crear el nombre del nuevo item
                const nuevoItemNombre = 'OT - ' + nombreCompleto;
    
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
                console.log('Subelemento procesado con éxito:', tipoFirmanteColumn.text);
           
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