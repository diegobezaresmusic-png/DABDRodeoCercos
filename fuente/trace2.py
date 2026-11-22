# Segunda vuelta del trazo. Coordenadas en pixeles de la captura original (1200x1600).
# Modelo: cada linea se dibuja EN EL SENTIDO DEL FLUJO y dice de quien recibe corriente.
#   F(padre, via, sw=None, gate=None, at=None)
#     via : 'j' union directa | 'br' cablecito amarillo que pasa sobre una puerta
#     sw  : id del switch rojo que esta en esa alimentacion (si lo abres, corta esta linea y lo que sigue)
#     gate: posicion de la puerta azul que brinca el cablecito
#     at  : punto del padre donde se conecta (si no, el mas cercano al inicio de la linea)

ENERGIZERS = {
    'E1': {'name': 'Energizador del interior', 'pos': (405, 732)},
    'E2': {'name': 'Energizador del perímetro', 'pos': (349, 715)},
}

def F(parent, via='j', sw=None, gate=None, at=None):
    return {'parent': parent, 'via': via, 'sw': sw, 'gate': gate, 'at': at}

L = {}   # name -> (display name, points, feed)

# ---------------- casa ----------------
L['EL']   = ('Salida del energizador', [(402,736),(396,745),(389,755),(386,760)], F('E1'))
L['H2']   = ('Casa → camino', [(412,733),(421,732),(423,728),(428,728),(440,738),(458,755),(470,766)], F('E1'))
L['HL']   = ('Casa → callejón norte', [(408,728),(413,718),(420,709),(427,703)], F('E1'))
L['HN']   = ('Pared norte de la casa', [(404,729),(408,723),(403,716),(397,710)], F('E1'))
L['HLw']  = ('Casa → callejón norte (lado oeste)', [(396,702),(401,694),(406,685)], F('HN','br'))
L['ENC']  = ('Cobertizo, lado oeste', [(386,759),(384,753),(378,760),(372,768),(385,780),(399,796)], F('EL'))
L['SHA']  = ('Cobertizo, lado este', [(388,757),(400,762),(414,770),(419,779),(413,790),(404,797)], F('EL'))
L['DW']   = ('Orilla de la entrada a la casa', [(467,774),(453,788),(440,779),(420,764)], F('H2','j',sw='S_road'))
L['HC']   = ('Cobertizo → corral', [(393,804),(380,792),(360,775),(348,762)], F('ENC'))
L['CORRAL']=('Corral', [(348,762),(352,766),(368,766),(374,756),(372,741),(360,736),(347,742),(345,756),(348,762)], F('HC'))
L['CL']   = ('Corral → potrero oeste', [(326,771),(320,785),(312,800),(308,806)], F('CORRAL','br',gate=(346,757),at=(346,758)))
L['CT']   = ('Corral → perímetro', [(368,726),(362,720),(358,713),(351,710)], F('CORRAL','br',at=(372,741)))
L['HT']   = ('Pared oeste de la casa', [(368,726),(373,714),(379,702)], F('CT'))

# ---------------- callejon norte ----------------
L['LA1']  = ('Callejón norte, alambre este (1)', [(414,686),(422,673),(440,655),(465,627),(478,611)], F('HL','br',gate=(424,695)))
L['LA2']  = ('Callejón norte, alambre este (2)', [(478,611),(497,590),(527,548),(560,502)], F('LA1','j',sw='S_alley'))
L['LB1']  = ('Callejón norte, alambre oeste (1)', [(406,684),(416,668),(426,657)], F('HLw'))
L['LB2']  = ('Callejón norte, alambre oeste (2)', [(436,647),(446,634),(459,619)], F('LB1','br',gate=(431,653)))
L['LB3']  = ('Callejón norte, alambre oeste (3)', [(472,603),(490,577),(520,540),(553,498)], F('LB2','br',sw='S_alley',gate=(466,611)))
L['N1']   = ('Esquina norte', [(556,501),(545,492),(537,489)], F('LA2'))
L['N2b']  = ('División norte 1, desde el callejón', [(560,502),(585,518),(607,533)], F('LA2'))
L['N3b']  = ('División norte 2, desde el callejón', [(527,548),(545,566),(562,582),(577,592)], F('LA2'))
L['N4a']  = ('División norte 3, desde el callejón', [(497,590),(508,605),(511,612)], F('LA2'))

# ---------------- camino ----------------
L['RNW']  = ('Camino, alambre norte', [(476,765),(485,749),(522,705),(552,668),(562,655),(603,612),(648,563),(700,506),(752,450),(797,399)], F('H2','j',sw='S_road'))
L['RSE1'] = ('Camino, alambre sur (1)', [(480,768),(520,726),(549,690),(568,671)], F('H2','j',sw='S_road'))
L['RSE2'] = ('Camino, alambre sur (2)', [(578,657),(612,622),(655,573),(705,517),(752,464),(806,402)], F('RSE1','br',gate=(573,664)))
L['H3']   = ('Ramal camino → centro', [(479,766),(482,764),(500,775),(521,786)], F('H2','j',sw='S_road'))
L['HK']   = ('Paso al callejón del centro', [(472,779),(469,784),(480,789)], F('H2','br',sw='S_road',gate=(474,776)))
L['H1']   = ('Ramal camino → casa', [(485,749),(470,735),(450,716),(440,706)], F('RNW','j',sw='S_h1'))
L['N4b']  = ('División norte 3, desde el camino', [(562,655),(548,636),(536,625),(530,622)], F('RNW'))
L['N3a']  = ('División norte 2, desde el camino', [(603,612),(592,604),(588,600)], F('RNW','j',sw='S_n3'))
L['N2a']  = ('División norte 1, desde el camino', [(648,563),(635,554),(622,546)], F('RNW','j',sw='S_n2'))
L['E4']   = ('Ramal que cruza el camino', [(552,668),(541,671),(538,680),(545,684),(549,691),(552,702),(560,713),(578,725),(598,735),(631,740)], F('RNW'))
L['C1']   = ('Diagonal del potrero central', [(586,733),(570,749),(550,773),(540,783),(536,789)], F('E4'))

# ---------------- este ----------------
L['E2L']  = ('Camino → potrero este', [(571,671),(590,682),(612,705),(633,724),(645,736)], F('RSE1'))
L['E6']   = ('Callejón este, alambre de adentro', [(645,736),(640,743),(630,754),(618,768),(603,785),(590,800),(580,812),(573,819)], F('E2L'))
L['C1b']  = ('Remate de la diagonal central', [(573,819),(560,807),(548,797)], F('E6'))

# ---------------- callejon casa-centro ----------------
L['PU']   = ('Callejón casa–centro, alambre norte', [(486,790),(500,796),(520,806),(540,817),(560,826),(566,828)], F('HK','br'))
L['PL']   = ('Callejón casa–centro, alambre sur', [(480,797),(500,805),(520,814),(540,825),(549,831)], F('HK'))
L['VL']   = ('Callejón casa–centro → potrero cerrado', [(480,792),(478,795),(466,808),(455,802),(451,800)], F('HK'))
L['LOOP'] = ('Potrero cerrado', [(432,815),(422,832),(422,842),(440,862),(470,880),(490,888),(500,866),(500,850),(480,825),(462,810),(449,806),(432,815)], F('VL','br',gate=(436,806),at=(451,800)))
L['E5']   = ('Callejón este, alambre de afuera', [(578,832),(584,814),(598,797),(612,783),(630,766),(648,746)], F('PU','br',gate=(581,836)))
L['E3']   = ('Subida a la puerta del este', [(648,746),(652,740),(660,728),(665,720)], F('E5'))
L['E1L']  = ('Potrero este → perímetro', [(680,722),(700,734),(740,762),(780,788),(812,809)], F('E3','br',gate=(671,716)))
L['SE0']  = ('Paso a la línea sureste', [(556,836),(563,840)], F('PL','j',sw='S_tr'))
L['SE1']  = ('Centro → perímetro sureste', [(583,846),(600,855),(640,880),(680,903),(721,926)], F('SE0','br'))
L['TR1']  = ('Troncal central', [(551,837),(540,850),(528,862),(512,878),(497,893),(485,906),(474,918),(458,936),(451,941)], F('PL','j',sw='S_tr'))
L['C2']   = ('Troncal → ramal oeste', [(474,918),(460,909),(445,898),(426,886)], F('TR1'))

# ---------------- cruce central (4 switches) ----------------
L['TRNWu']= ('Cruce central → oeste, alambre norte', [(445,936),(430,926),(416,920)], F('TR1','j',sw='S_w1'))
L['L2a']  = ('Callejón oeste, alambre este', [(394,905),(383,899),(374,895),(367,884),(372,870),(380,857),(390,842),(399,826),(403,814),(407,807),(410,805),(413,806),(417,812),(421,806),(425,795),(430,788),(436,788),(440,793),(439,801)], F('TRNWu','br',gate=(405,912)))
L['C3']   = ('Ramal del callejón oeste', [(380,857),(392,867),(407,876)], F('L2a'))
L['TRNWl']= ('Cruce central → oeste, alambre sur', [(446,945),(436,947),(425,940),(412,931)], F('TR1','j',sw='S_w2'))
L['TRNWl2']=('Cruce central → oeste, alambre sur (2)', [(388,917),(378,911),(366,906)], F('TRNWl','br',gate=(400,923)))
L['S2']   = ('Cruce central → nodo suroeste', [(440,956),(420,976),(395,1000),(370,1028),(345,1055),(326,1078),(321,1088)], F('TR1','br',sw='S_sw',gate=(447,949)))
L['S1']   = ('Cruce central → perímetro sureste', [(471,951),(500,968),(550,999),(600,1030),(626,1046)], F('TR1','br',sw='S_se'))

# ---------------- nodo suroeste ----------------
L['M0']   = ('Nodo suroeste', [(318,1094),(312,1097),(302,1102)], F('S2','j',sw='S_nodo'))
L['W1']   = ('Línea oeste', [(305,1082),(296,1074),(285,1056),(276,1033),(268,1008),(261,985),(255,960),(247,935),(240,918),(233,902),(240,888),(250,871)], F('M0','br',at=(318,1094)))
L['L2b']  = ('Callejón oeste (sur), alambre este', [(309,1081),(304,1068),(293,1055),(290,1037),(293,1013),(303,993),(317,962),(330,940),(343,920),(352,905)], F('W1'))
L['S4']   = ('Nodo suroeste → perímetro este', [(332,1101),(345,1104),(400,1108),(450,1109),(500,1110),(556,1111)], F('M0','br',at=(318,1094)))
L['M5']   = ('Nodo suroeste → switch sur', [(312,1117),(300,1126),(301,1130)], F('M0','br',gate=(307,1110),at=(318,1094)))
L['S5']   = ('Nodo suroeste → perímetro sur', [(305,1133),(350,1163),(400,1194),(450,1225),(472,1237)], F('M5','j',sw='S_sur'))

# ---------------- oeste ----------------
L['L1']   = ('Callejón oeste, alambre oeste', [(388,822),(382,840),(372,852),(365,862),(357,875),(350,890),(342,900),(332,912),(323,933),(310,953),(297,977),(283,997),(272,1012)], F('ENC','br',gate=(391,811)))
L['S3']   = ('Ramal oeste → centro', [(320,952),(350,967),(370,983),(383,1003)], F('L1'))
L['CW1b'] = ('Potrero oeste, lado norte (este)', [(365,860),(352,846),(335,830),(322,819)], F('L1'))
L['WX']   = ('Diagonal del potrero oeste', [(332,912),(316,900),(300,887),(280,870),(260,856)], F('L1','j',sw='S_wx'))
L['CW1a'] = ('Potrero oeste, lado norte (oeste)', [(260,856),(275,840),(290,826),(304,814)], F('WX'))

# ---------------- perimetro (circuito propio) ----------------
L['PER_N']= ('Perímetro norte', [(346,709),(534,482),(392,366),(389,354),(649,255),(692,300),(782,383),(795,393)], F('E2'))
L['PER_W']= ('Perímetro oeste', [(346,709),(107,995)], F('E2'))
L['PER_S']= ('Perímetro sur y este', [(107,995),(109,1037),(120,1096),(132,1122),(166,1165),(368,1373),(467,1253),(482,1238),(580,1116),(590,1099),(632,1049),(695,967),(729,930),(763,883),(821,815),(845,780),(1025,557),(1023,546),(832,413),(808,402)], F('PER_W','j',sw='S_per'))
L['PSt1'] = ('Ramal del perímetro junto al corral', [(313,751),(325,761)], F('PER_W'))
L['PS']   = ('Ramal del perímetro al potrero oeste', [(217,859),(222,874),(225,884)], F('PER_W'))
L['S6']   = ('Ramal del perímetro al nodo suroeste', [(205,1201),(225,1183),(260,1150),(285,1122),(291,1113)], F('PER_S'))
PERIMETER_LINES = {'PER_N', 'PER_W', 'PER_S'}

SWITCHES = {
    'S_road':  {'name': 'Salida al camino',                    'pos': (472,768)},
    'S_h1':    {'name': 'Ramal camino → casa',                 'pos': (485,749)},
    'S_n3':    {'name': 'División norte 2',                    'pos': (603,612)},
    'S_n2':    {'name': 'División norte 1',                    'pos': (648,563)},
    'S_alley': {'name': 'Callejón norte',                      'pos': (474,605)},
    'S_tr':    {'name': 'Troncal central',                     'pos': (551,833)},
    'S_w1':    {'name': 'Cruce central → oeste (alambre norte)','pos': (447,936)},
    'S_w2':    {'name': 'Cruce central → oeste (alambre sur)', 'pos': (437,947)},
    'S_sw':    {'name': 'Cruce central → suroeste',            'pos': (456,948)},
    'S_se':    {'name': 'Cruce central → sureste',             'pos': (468,949)},
    'S_nodo':  {'name': 'Nodo suroeste',                       'pos': (317,1092)},
    'S_sur':   {'name': 'Nodo suroeste → sur',                 'pos': (302,1132)},
    'S_wx':    {'name': 'Potrero oeste',                       'pos': (333,913)},
    'S_per':   {'name': 'Perímetro, esquina oeste',            'pos': (107,996)},
}

# Puertas sin cablecito (la corriente no pasa)
GATES = [(800,400),(614,539),(583,596),(520,617),(435,704),(411,683),(649,738),(533,790),(380,750),(329,765),
         (310,813),(409,804),(416,881),(359,895),(229,895),(256,863),(270,1010),(386,1006),(297,1106),(566,1113)]

# Dudas ya contestadas por Diego: numero -> resumen. No se borran de DOUBTS para no cambiar la numeracion.
RESOLVED = {1: 'energizador del interior, bien ubicado', 2: 'energizador del perímetro, bien ubicado'}

# Dudas para Diego: (posicion, texto)
DOUBTS = [
    ((405,732), 'Energizador del interior: lo puse en la casa, en la marca amarilla con naranja. ¿Es ahí?'),
    ((349,715), 'Energizador del perímetro: lo puse en el rayito chico pegado al perímetro, junto a la casa. ¿Es ahí?'),
    ((573,664), 'Esta marca amarilla gruesa sobre el camino la tomé como cablecito sobre una puerta, no como rayito. ¿Correcto?'),
    ((472,768), 'Este switch me quedó como el principal: corta el camino, el centro y todo el sur (unos 8 km). ¿Es así, o solo corta el camino?'),
    ((485,749), '¿Este switch corta solo el ramal que va hacia la casa, o todo el alambre norte del camino?'),
    ((474,605), 'Hay una rayita roja en el callejón. La puse como switch que corta los dos alambres del callejón hacia el norte. ¿Es un switch?'),
    ((575,828), 'Centro: supuse que el alambre norte del callejón brinca la puerta y sube por el alambre de afuera hasta la línea del perímetro este, y que el switch corta la troncal y la línea al sureste.'),
    ((452,944), 'Aquí conté 4 switches: dos hacia el oeste (uno por alambre), uno al suroeste y uno al sureste. ¿Son 4?'),
    ((316,1094), 'Nodo suroeste: puse el switch de arriba cortando todo el nodo (línea oeste, línea al este y línea al sur).'),
    ((386,756), 'Zona de la casa, cobertizo y corral: es donde menos seguro estoy de qué se conecta con qué.'),
    ((107,996), 'Rayita roja en la esquina oeste del perímetro: la puse como switch que corta el lado sur y este del perímetro.'),
    ((265,1150), 'Tres ramales salen del perímetro hacia adentro (este, el del potrero oeste y el del corral). Los puse en el circuito del perímetro.'),
    ((553,528), 'Vi signos de interrogación tuyos en los potreros del norte y junto al ramal oeste. ¿Falta algo ahí?'),
]
