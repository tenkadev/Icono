"""Build the bundled, offline catalog from pinned Iconify collections."""
import json, pathlib, re, copy, xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'plugin/data'
tabler = json.loads((DATA / 'tabler-icons.json').read_text(encoding='utf-8'))
brands = json.loads((DATA / 'fa6-brands-icons.json').read_text(encoding='utf-8'))
allowed = {'path','g','circle','ellipse','rect','line','polyline','polygon'}
attrs = {'d','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-rule','clip-rule','opacity','fill-opacity','stroke-opacity','transform','x','y','x1','y1','x2','y2','width','height','rx','ry','r','cx','cy','points'}
def check(body):
    root = ET.fromstring('<svg>'+body+'</svg>')
    definitions = {e.get('id'):e for e in root.iter() if e.get('id')}
    for parent in list(root.iter()):
        for idx,e in enumerate(list(parent)):
            if e.tag=='use':
                ref=e.get('href','')
                assert ref.startswith('#') and ref[1:] in definitions
                replacement=copy.deepcopy(definitions[ref[1:]])
                replacement.attrib.pop('id',None)
                parent.remove(e);parent.insert(idx,replacement)
            elif e.tag=='defs': parent.remove(e)
    for e in list(root.iter())[1:]:
        e.attrib.pop('class',None)
        assert e.tag in allowed, e.tag
        assert set(e.attrib).issubset(attrs), e.attrib
        assert not any('url(' in v or 'javascript:' in v for v in e.attrib.values())
    return ''.join(ET.tostring(e,encoding='unicode') for e in root)

translations = {
'user':'usuario persona perfil contacto cliente', 'users':'personas equipo grupo clientes',
'phone':'telefono celular movil llamar llamada', 'device-mobile':'celular telefono movil',
'home':'casa hogar inicio domicilio', 'mail':'correo email sobre mensaje',
'send':'enviar mensaje avion', 'message':'mensaje chat conversacion whatsapp',
'map-pin':'ubicacion direccion lugar localizacion', 'map':'mapa direccion ubicacion',
'world':'web internet mundo planeta pagina sitio', 'globe':'web internet mundo planeta',
'heart':'corazon amor favorito salud', 'thumb-up':'me gusta like pulgar',
'thumb-down':'no me gusta dislike', 'search':'buscar lupa busqueda',
'bookmark':'guardar marcador favorito', 'plus':'mas agregar añadir', 'minus':'menos quitar',
'star':'estrella favorito calificacion', 'shopping':'compra compras tienda carrito bolsa',
'basket':'cesta canasta compras', 'building-store':'tienda negocio local comercio',
'building':'edificio empresa oficina', 'credit-card':'tarjeta credito pago',
'cash':'dinero efectivo pago', 'currency':'moneda dinero precio',
'truck':'camion envio reparto delivery', 'car':'auto coche carro vehiculo',
'motorbike':'moto motocicleta', 'bike':'bicicleta', 'tool':'herramienta taller reparacion',
'hammer':'martillo herramienta', 'settings':'configuracion ajustes engranaje',
'calendar':'calendario fecha cita', 'clock':'reloj hora horario tiempo',
'alarm':'alarma reloj', 'check':'visto bueno aceptar correcto verificar',
'x':'cerrar equis cancelar', 'arrow':'flecha direccion', 'chevron':'flecha',
'camera':'camara foto fotografia', 'photo':'foto imagen paisaje', 'video':'video grabacion',
'microphone':'microfono audio sonido', 'volume':'volumen sonido audio',
'music':'musica nota', 'headphones':'audifonos auriculares musica',
'player':'reproducir audio video', 'book':'libro lectura educacion',
'school':'escuela colegio academia educacion', 'certificate':'certificado diploma',
'pencil':'lapiz dibujar escribir editar', 'edit':'editar cambiar',
'paint':'pintura color pintar', 'palette':'paleta color diseño',
'brush':'pincel pintar', 'printer':'impresora impresion imprimir',
'file':'archivo documento', 'folder':'carpeta archivos', 'download':'descargar bajar',
'upload':'subir cargar', 'cloud':'nube', 'lock':'candado cerrado seguridad',
'key':'llave clave contraseña', 'shield':'escudo seguridad proteccion',
'eye':'ojo ver vista', 'eye-off':'ocultar invisible', 'bell':'campana notificacion aviso',
'gift':'regalo obsequio', 'tag':'etiqueta precio oferta', 'discount':'descuento oferta promocion',
'percentage':'porcentaje descuento', 'bolt':'rayo energia electricidad', 'bulb':'foco bombilla idea luz',
'sun':'sol dia calor', 'moon':'luna noche', 'umbrella':'paraguas sombrilla',
'flower':'flor flores', 'leaf':'hoja naturaleza planta', 'tree':'arbol bosque',
'plant':'planta naturaleza', 'paw':'pata mascota huella', 'cat':'gato mascota felino',
'dog':'perro mascota canino', 'fish':'pez pescado', 'bone':'hueso mascota',
'tooth':'diente dental odontologia dentista', 'dental':'diente dental odontologia dentista', 'stethoscope':'estetoscopio doctor medico',
'medical':'medico salud clinica', 'hospital':'hospital clinica salud',
'nurse':'enfermera salud', 'pill':'pastilla medicina farmacia', 'first-aid':'botiquin primeros auxilios',
'pizza':'pizza comida', 'burger':'hamburguesa comida', 'ice-cream':'helado helados',
'cup':'taza vaso bebida', 'coffee':'cafe bebida', 'bottle':'botella bebida',
'glass':'vaso copa bebida', 'cake':'torta pastel cumpleaños', 'apple':'manzana fruta',
'lemon':'limon fruta', 'chef':'cocinero cocina comida', 'tools-kitchen':'cubiertos restaurante comida',
'shirt':'camisa polo camiseta ropa', 'hanger':'gancho colgador ropa', 'shoe':'zapato calzado',
'tent':'toldo carpa camping', 'flag':'bandera banderola', 'megaphone':'megafono anuncio publicidad',
'speakerphone':'megafono anuncio publicidad', 'ad':'anuncio publicidad', 'chart':'grafico estadistica analitica',
'trophy':'trofeo premio', 'medal':'medalla premio', 'rosette':'sello insignia',
'qrcode':'qr codigo', 'barcode':'codigo barras', 'wifi':'internet wifi señal',
'link':'enlace link cadena', 'brand':'marca logo red social',
}
brandcolors = {'facebook-f':'1877F2','facebook':'1877F2','instagram':'E1306C','x-twitter':'000000','twitter':'1DA1F2','pinterest-p':'E60023','pinterest':'E60023','tiktok':'000000','youtube':'FF0000','twitch':'9146FF','discord':'5865F2','telegram':'26A5E4','whatsapp':'25D366','threads':'000000','facebook-messenger':'0084FF','snapchat':'FFFC00','linkedin-in':'0A66C2','linkedin':'0A66C2','google':'4285F4','spotify':'1DB954','github':'24292F','behance':'1769FF'}
priority = ['facebook-f','instagram','x-twitter','pinterest-p','tiktok','youtube','twitch','discord','telegram','whatsapp','threads','facebook-messenger','snapchat','linkedin-in']
common = ['user','device-mobile','home','mail','send','map-pin','world','heart','thumb-up','square-plus','search','bookmark','message-circle','phone','clock','calendar','shopping-cart','star','dental','paw','pizza','ice-cream','tent']
catalog = []
for name, icon in brands['icons'].items():
    aliases = ['red social redes logo marca', name.replace('-', ' ')]
    if name == 'x-twitter': aliases.append('twitter x')
    if name == 'whatsapp': aliases.append('wasap watsapp wsp guasap')
    catalog.append({'id':'brand:'+name,'name':name.replace('-', ' ').title(), 'key':name,
      'family':'brands','w':icon.get('width',brands.get('width',16)),
      'h':icon.get('height',brands.get('height',16)), 'solid':check(icon['body']),
      'color':'#'+brandcolors.get(name,'111111'), 'tags':' '.join(aliases),
      'rank':priority.index(name) if name in priority else 10000})
for name, icon in tabler['icons'].items():
    if name.endswith('-filled') and name[:-7] in tabler['icons']: continue
    filled = name.endswith('-filled')
    entry={'id':'tabler:'+name,'name':name.replace('-', ' ').title(),'key':name,
      'family':'tabler','w':icon.get('width',tabler.get('width',24)),
      'h':icon.get('height',tabler.get('height',24)),
      'solid' if filled else 'outline':check(icon['body']),
      'tags':' '.join(v for k,v in translations.items() if name==k or name.startswith(k+'-') or ('-'+k+'-') in name),
      'rank':100+common.index(name) if name in common else 20000}
    if not filled and name+'-filled' in tabler['icons']:
        entry['solid']=check(tabler['icons'][name+'-filled']['body'])
    catalog.append(entry)
catalog.sort(key=lambda e:(e.pop('rank'),e['name']))
json_data=json.dumps(catalog,ensure_ascii=False,separators=(',',':'))
(DATA/'catalog.json').write_text(json_data, encoding='utf-8')
(DATA/'catalog.js').write_text('window.ICON_CATALOG='+json_data+';\n', encoding='utf-8')
print('Catalog:',len(catalog),'icons;',sum('solid'in i and 'outline'in i for i in catalog),'paired styles')
