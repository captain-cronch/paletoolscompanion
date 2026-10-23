# Paletools Companion — resumen de funciones

Paletools Companion es un userscript de Tampermonkey que se ejecuta junto a Paletools en la aplicación web de EA FC Ultimate Team. No modifica el script de Paletools. Añade reglas y herramientas para abrir sobres en cantidad, decidir qué vale cada carta, vaciar una lista de transferencias llena y usar en los desafíos de creación de plantillas las cartas que se van acumulando.

El botón **Companion** está en la esquina inferior derecha de la aplicación web. Los ajustes se dividen en Pack Opener, Players, Managers, Club scan y SBC templates.

Los nombres de botones y opciones se dejan en inglés porque así aparecen en la interfaz.

## Reglas de sobres

Paletools pide una sola acción para todos los jugadores, otra para todos los entrenadores y otra para el resto de objetos. Eso se queda corto cuando una sesión abre muchos sobres: el usuario puede querer tratar de distinta forma a los jugadores de distintas ligas, o a los entrenadores de ciertos países.

Companion oculta esos tres menús de Paletools y los sustituye por una matriz de reglas. Cada carta se reparte desde esa matriz. Las cuatro acciones son:

| Acción | Para qué sirve |
| --- | --- |
| **Club** | Guardar un objeto nuevo en el club. Los duplicados no pueden usar esta acción, porque el club ya tiene una copia. |
| **Quick sell** | Convertir la carta en monedas al momento. Sirve para lo que no se va a vender. |
| **Transfer list (unlisted)** | Poner la carta en la lista de transferencias sin ponerla a la venta. Sirve para duplicados que quizá entren en un SBC, o para cartas que todavía no quieres tasar. |
| **Dig+list (market)** | Consultar el valor de mercado actual y poner la carta a la venta. Sirve cuando la carta sí debería venderse. |

Jugadores y entrenadores se dividen en cuatro casos: nuevo e importante, nuevo y resto, duplicado e importante, duplicado y resto. «Importante» significa que la liga o el país de la carta está marcado en Companion. La lista de ligas importantes del propio Paletools no se toca.

El punto de partida habitual es: los jugadores nuevos van al club, los duplicados de una liga o un país importante se listan, el resto de duplicados queda sin listar en la lista de transferencias, los entrenadores importantes se listan y el resto se vende al instante.

## Listas de jugadores

La pestaña **Players** son dos listas: ligas y países. Cada fila tiene una casilla **Pack** y una casilla **SBC**, porque las dos tareas no son la misma.

**Pack** decide qué jugadores cuentan como importantes mientras se abren sobres. Un jugador es importante si su liga o su país está marcado. Eso es lo que manda un duplicado a Dig+list en lugar de dejarlo sin listar.

**SBC** decide qué ligas y países se protegen al completar SBCs. Solo se usa en un paso de plantilla que tenga activado **Not Important Leagues Only** o **Not Important Nations Only**. Los duplicados de una liga o un país marcado sí se pueden usar si están marcados **Ignore Importance for Transfer List** o **Ignore Importance for SBC Storage**. La última copia del club se queda fuera, para que un desafío no gaste al único jugador que tienes de una liga que estás juntando.

Select all y Deselect all cambian la columna Pack. Las ligas que más se usan aparecen primero; el resto sigue en orden alfabético.

## Listas de entrenadores

La pestaña **Managers** aplica la misma idea a las cartas de entrenador: una lista de ligas y una lista de países. Un entrenador es importante si su país o su liga está marcado.

La finalidad es listar los entrenadores que de verdad se venden y vender al instante el resto. Son pocas cartas por sobre, pero tratarlos todos igual o tira a la basura los que se venden, o llena la lista de transferencias con los que no se mueven.

## Objetos del club

Todo lo que no es jugador ni entrenador se agrupa como los filtros del club: **Club**, **Structure**, **Cosmetics** y **Consumables**. Cada grupo tiene una acción para objetos nuevos y otra para duplicados.

La mayoría de estos objetos no merece una decisión aparte, así que basta la acción del grupo. Algunos tipos sí merecen otro trato. El estadio es el caso habitual: un estadio nuevo puede ir al club y un estadio duplicado puede quedar sin listar, mientras el resto de Structure se vende al instante. Marcar un tipo lo saca del grupo y le da su propia fila. Una configuración ya guardada que trataba un tipo de otra forma lo deja marcado.

Los grupos son:

- **Club** — equipaciones, balón, celebraciones, apodo, himno, cánticos, canción de gol, escudo
- **Structure** — estadio, tema, pintura, asientos, zona VIP, porterías, cañones, líneas del campo, dibujos del campo
- **Cosmetics** — tifos, pancartas, trofeos, tarjetas de la grada
- **Consumables** — estilos de química, objetos de liga de entrenador, curación

Un objeto que Companion no reconoce usa la acción del grupo Club, y la forma se anota una vez para poder añadirla después.

## Precio a salvo del undercut

Dig+list usa la búsqueda de precio más bajo de Paletools, la misma que la tecla **V**, y después aplica **Min cheaper listings (undercuts)** de Companion.

El ajuste de undercuts sube por la escala de precios hasta encontrar una compra inmediata que ya tenga al menos N ventas más baratas por debajo. El valor por defecto es 3. Con 2 ventas a 200, 1 a 250 y 3 a 300, la carta se lista a 300. Si el valor es 0, se lista al precio más bajo del momento.

Las ventas duran una hora. El precio de salida es un escalón de mercado por debajo de la compra inmediata.

## Ritmo de las acciones

Las búsquedas de mercado, las ventas, los movimientos a la lista de transferencias y las ventas rápidas que quedan se separan con pausas cortas y aleatorias. Un sobre lleno de cartas que hay que tasar tarda más que un sobre que solo se vende al instante. La pausa existe para que una sesión larga tenga menos probabilidad de chocar con el límite de peticiones de EA.

Si una búsqueda o una venta devuelve una señal de límite o de softban, el listado automático se detiene durante el resto de esa sesión.

## Plantillas de Pack Opener

Una configuración de apertura es un sobre, una moneda, una cantidad, una velocidad, la opción de lista llena, un SBC para liberar espacio, un número de undercuts y el conjunto completo de reglas. El usuario puede querer un comportamiento completamente distinto al abrir sobres de bronce y sobres de plata, por ejemplo.

**Save Template**, en la pantalla de Pack Opener, guarda esa configuración con un nombre. Guardar el mismo nombre otra vez la sustituye. Las listas de ligas y países de jugadores y entrenadores siguen siendo ajustes compartidos de Companion. No van dentro de la plantilla, porque describen el club que estás armando, no un sobre concreto.

En la página de la tienda, **Pack Opener Templates** muestra cada configuración guardada. La cantidad guardada es el número inicial; se puede cambiar antes de pulsar **Start**. Start abre la lista de sobres, selecciona la pestaña de la tienda donde está ese sobre, aplica la plantilla y confirma. Si el sobre no está en la tienda actual, la fila lo indica y no empieza nada.

## Cuando se llena la lista de transferencias

Abrir sobres deja de servir en cuanto la lista de transferencias no tiene huecos. Paletools puede vender al instante lo que no cabe, o parar. Companion añade **Free space and continue**.

Con esa opción seleccionada y la lista llena, Companion:

1. Retira lo que ya se vendió.
2. Puede ejecutar un SBC de espacio libre, descrito abajo, para entregar jugadores duplicados y liberar sus copias de la lista.
3. Manda al club las cartas sin listar que no son duplicados. Las ventas activas y las caducadas se quedan donde están. Los duplicados que no son jugadores, como equipaciones, escudos y estadios, también se quedan en la lista.
4. Sigue abriendo sobres si se liberaron al menos cinco huecos.
5. Se detiene si se liberaron menos de cinco. Esas cartas quedan sin asignar. No se venden al instante.
6. Si una carta posterior no puede moverse porque la lista se volvió a llenar, Companion libera espacio y la mueve antes del siguiente sobre.

Si abrir, construir o enviar el desafío falla, ese paso se salta. El envío de cartas al club se hace igual. Un límite de peticiones durante esta limpieza detiene la sesión igual que un límite durante Dig+list. Una limpieza que falla no se reintenta hasta la siguiente sesión de Pack Opener.

### SBC de espacio libre

El desplegable que hay bajo **Free space and continue** es opcional. **None** lo salta.

La lista incluye SBCs de formación que ya tienen una plantilla de Paletools, y SBCs simplificados que tienen una plantilla de Companion. Cada opción se muestra con el título del desafío.

Un SBC de formación se abre y se construye con **Build Using Template** de Paletools. Un SBC simplificado lee los jugadores sin listar de la lista de transferencias, busca en el club las copias comunes y raras que coinciden, y las envía. Si el desafío no se había empezado, se empieza primero. Las completaciones se repiten hasta que se acaban las copias. Una plantilla que no llega a la puntuación exigida se envía igual, y la siguiente pasada de espacio libre continúa desde la puntuación que quedó guardada. El sentido del paso es gastar jugadores duplicados para que sus copias sin listar puedan ir al club, no terminar el desafío de una sola vez.

## Parar y seguir una sesión

**Stop after this pack** aparece a la derecha mientras Pack Opener está en marcha. Termina el sobre que ya está abierto, se detiene y muestra el resultado normal de los sobres abiertos hasta ese momento. Sirve para salir de una sesión sin dejar un sobre a medias.

El panel **Pack run summary** aparece a la izquierda durante la sesión. Muestra los sobres abiertos frente al total previsto, a dónde fueron jugadores, entrenadores y el resto de objetos, y el resultado en monedas: monedas gastadas, monedas recuperadas de los sobres (no funciona en este momento), venta rápida, lo que se espera ingresar por la lista de transferencias después del 5 % de impuesto, el total recuperado, y la ganancia o la pérdida de la sesión y por sobre. Las cartas destacadas aparecen cuando la sesión las tiene. El panel está para ver si las reglas están haciendo lo que querías antes de que termine la sesión.

Al terminar, Companion añade filas de resumen para los jugadores y entrenadores que se listaron, y un panel de detalle con cada carta puesta a la venta: tipo, nombre, media, precio de compra inmediata y precio de salida.

## Escaneo de valor del club

Abrir sobres en masa puede mandar al club muchos escudos, equipaciones, tifos y objetos de estadio. Casi todos están listados en el mercado al precio mínimo de compra inmediata, y ese precio ya tiene una cola larga de ventas. Unos pocos son lo bastante escasos como para guardarlos.

**Scan club list value** lee la lista del club que ya filtraste. De cada objeto abre la ficha, consulta el mercado y lo vende al instante o lo deja.

| Resultado | Qué hace | Por qué |
| --- | --- | --- |
| No intercambiable | Venta rápida | No se puede vender en el mercado. |
| Intercambiable, la compra inmediata más baja es el mínimo permitido, y ya hay más de N cartas listadas ahí | Venta rápida | La cola al precio mínimo es demasiado larga para merecer una venta. N por defecto es 5. |
| Intercambiable, hay menos de N ventas en el mínimo, o la compra inmediata más baja está por encima del mínimo | Conservar | Hay posibilidad de que la carta se venda por encima del precio de descarte. |
| No hay ventas ahora, o la consulta falla | Conservar | El precio es desconocido, así que la carta no se descarta. |

Solo quedan los objetos intercambiables con valor que se conservaron. Los duplicados posteriores de estas cartas se pueden mandar a la lista de transferencias sabiendo que antes tuvieron valor. El escaneo pasa solo las páginas de la lista filtrada que el usuario eligió en la página del club. **Stop club scan** lo corta. Si la consulta de mercado o una venta rápida devuelve una señal de límite, el escaneo se detiene enseguida para no alargar el bloqueo con más peticiones. Esto ha provocado un softban después de consultar el valor de más de 800 objetos de bronce del club.

El umbral N se configura en Companion → **Club scan**.

## Desafíos de creación de plantillas

### Fuentes de la lista de transferencias sin listar

El constructor de plantillas de Paletools puede tomar jugadores del almacén de SBC y del club. Companion añade **Unlisted Transfers** a esa lista de fuentes, solo o combinado con el almacén y el club.

Una carta que está sin listar en la lista de transferencias no se puede colocar directamente en la plantilla. Eso falla con «Failed to save changes to SBC Squad». Companion usa la misma idea que el botón **Use transfer list players** de Paletools: lee las cartas sin listar, busca las copias equivalentes en el club y le pasa esas copias del club al constructor. Las ventas activas se ignoran. Los filtros de media, país y liga de la plantilla se siguen aplicando.

Cuando una fuente mezcla la lista de transferencias con el club o el almacén, las copias de la lista se toman primero. Si no, una elección por la media más barata puede saltarse los duplicados que querías usar. **Unlisted Transfers** solo usa esas copias del club.

Cuando un desafío se envía bien, Companion quita la marca de duplicado de las copias sin listar de los jugadores que se acaban de usar, y actualiza la caché de la lista de transferencias. **Send Non Duplicated To Club** puede entonces mover esas cartas al club.

### Proteger a los jugadores que quieres guardar

Dos pares de filtros deciden quién puede entrar.

**Important leagues only** e **important nations only** usan las listas importantes del propio Paletools.

**Not important leagues only** y **not important nations only** usan la columna SBC de la pestaña Players de Companion. Los duplicados de una liga o un país marcado siguen pudiendo usarse. La última copia del club no. Si esos dos interruptores están apagados, la columna SBC no se tiene en cuenta.

Cada paso de plantilla tiene además **Ignore Importance for Transfer List** e **Ignore Importance for SBC Storage**. Déjalos apagados y las cartas de esos montones siguen las mismas reglas de importancia que los jugadores del club. Enciende uno cuando quieras que cualquier carta de ese montón se pueda usar, incluidos los duplicados cuya copia del club se retendría. La elección se queda en ese paso. Pack Opener sigue mirando solo la casilla Pack.

### Plantillas de SBC simplificadas

Algunos desafíos de SBC no usan formación. Cada jugador tiene una puntuación, y el desafío pide un total. Las plantillas de formación de Paletools no cubren esos desafíos. Companion guarda una plantilla distinta por desafío en **SBC templates**. Esas plantillas no se escriben en el almacén de plantillas de Paletools.

Cada paso es una cantidad de jugadores más el mismo tipo de filtros que un paso de plantilla: rango de media, liga, país, importancia y fuente. Deja la cantidad vacía para seguir tomando jugadores que encajen hasta cubrir la puntuación, o hasta llenar el área de trabajo. Un número significa exactamente esa cantidad. Posición, química, mismo club y máximo de jugadores no forman parte de estos pasos. Las cartas especiales se dejan fuera. Solo se eligen cartas comunes y raras normales.

En la página del desafío de SBC, **Edit Template** abre el editor de pasos y **Select from Template** marca a los jugadores que coinciden en el área de trabajo que ya está abierta. Ninguno de los dos botones envía el desafío. **Select**, en el panel de Companion, hace lo mismo: el área de trabajo tiene que estar ya abierta, se borra la selección anterior, se marcan los jugadores que coinciden y se actualiza la barra de progreso. Dentro de un paso se usan las puntuaciones más bajas, después de las copias del club que venían sin listar. Si una cantidad exacta no se puede completar, no se selecciona nada. Si una cantidad vacía no llega al requisito, el total corto se queda seleccionado para que decidas qué hacer, y la búsqueda se detiene ahí en lugar de recorrer el resto del club.

**Refresh** carga los conjuntos de SBC que todavía no están en memoria, para que un desafío de un clic pueda aparecer en el desplegable.

Esas mismas plantillas son las que usa el espacio libre cuando la lista de transferencias está llena. En la página del desafío, Select solo rellena la plantilla. Durante el espacio libre, Companion envía las copias del club que coinciden, incluida una puntuación parcial, para que los jugadores duplicados salgan de la lista de transferencias.

## Registro de depuración

**Copy debug log**, en el panel de Companion, copia los últimos 400 mensajes de Companion de la carga actual de la página. Incluye el desafío de espacio libre y cada línea de apertura, construcción y envío. Sirve para diagnosticar una sesión que se detuvo antes de tiempo sin tener que mirar la consola durante toda la apertura.
