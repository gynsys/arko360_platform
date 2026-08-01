import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db.base import SessionLocal
from app.db.models.cost360 import CostItem

def asignar_subcategoria_v2(cat, desc, subcat_actual):
    if not desc:
        desc = ""
    desc = desc.upper()
    cat = cat.upper() if cat else ""
    
    if subcat_actual and 'Otros' not in subcat_actual:
        return subcat_actual
        
    # ============================================================
    # REFINAR EDIFICACIONES
    # ============================================================
    if cat == 'EDIFICACIONES':
        # ESTRUCTURA
        if any(k in desc for k in ['CONCRETO', 'ENCOFRADO', 'CIMENTACION', 'ZAPATA', 'VIGA', 'COLUMNA', 'LOSA', 'PLACA', 'FUNDACION']):
            if 'ENCOFRADO' in desc:
                return 'Estructura - Encofrado'
            if any(k in desc for k in ['ACERO', 'CABILLA', 'MALLA', 'REFUERZO']):
                return 'Estructura - Acero de Refuerzo'
            return 'Estructura - Concreto'
        
        # ACABADOS
        if any(k in desc for k in ['PINTURA', 'BARNIZ', 'ESMALTE', 'LATEX', 'TEXTURIZADA', 'MARTILLADA', 'POLIURETANO', 'GRAFIADO', 'ALUMINIZADA', 'FONDO', 'ACABADO']):
            return 'Acabados - Pintura'
        if any(k in desc for k in ['PISO', 'CERAMICA', 'PORCELANATO', 'MARMOL', 'GRANITO', 'VINYL', 'ALFOMBRA', 'PARQUET', 'CANTO RODADO', 'GOMA VULCANIZADA', 'CAICO']):
            return 'Acabados - Pisos y Revestimientos'
        if any(k in desc for k in ['CIELO RASO', 'PLAFOND', 'DRY WALL', 'SUSPENSION', 'YESO', 'FIBRA DE VIDRIO']):
            return 'Acabados - Cielos Rasos'
        if any(k in desc for k in ['FRISO', 'MORTERO', 'ENLUCIDO', 'REVESTIMIENTO', 'ENCAMISADO']):
            return 'Acabados - Frisos y Revestimientos'
        
        # CARPINTERÍA
        if any(k in desc for k in ['PUERTA', 'VENTANA', 'CLOSET', 'MUEBLE', 'COCINA', 'REPISA', 'ESCRITORIO', 'MESON', 'BARRA', 'GAVETA']):
            if any(k in desc for k in ['MADERA', 'CEDRO', 'ALGARROBO', 'MDF']):
                return 'Carpintería de Madera'
            if any(k in desc for k in ['METALICA', 'METALICO', 'HIERRO', 'ACERO']):
                return 'Carpintería Metálica'
            return 'Carpintería de Madera'
        
        # VIDRIO Y ALUMINIO
        if any(k in desc for k in ['VIDRIO', 'CRISTAL', 'ESPEJO', 'TEMPLEX', 'ALUMINIO', 'SEGURIT', 'ROMANILLA']):
            return 'Vidrio y Aluminio'
        
        # ELÉCTRICA
        if any(k in desc for k in ['CABLE', 'CONDUCTOR', 'TUBERIA CONDUIT', 'TUBERIA EMT', 'TUBERIA BX', 'CAJA', 'CAJETIN', 'BREAKER', 'INTERRUPTOR', 'CONTACTO', 'TOMA', 'TABLERO', 'TRANSFORMADOR', 'BALASTO', 'LAMPARA', 'LUMINARIA', 'BOMBILLO', 'REFLECTOR', 'TUBO FLUORESCENTE', 'PUNTO ELECTRICO']):
            if any(k in desc for k in ['CABLE', 'CONDUCTOR']):
                return 'Eléctrica - Cableado'
            if any(k in desc for k in ['BREAKER', 'INTERRUPTOR', 'TABLERO', 'TRANSFORMADOR', 'CONTACTOR']):
                return 'Eléctrica - Equipos y Protección'
            if any(k in desc for k in ['LAMPARA', 'LUMINARIA', 'BOMBILLO', 'REFLECTOR', 'TUBO FLUORESCENTE']):
                return 'Eléctrica - Iluminación'
            return 'Eléctrica - Canalizaciones y Cajas'
        
        # SANITARIA
        if any(k in desc for k in ['AGUAS', 'SANITARIA', 'W.C.', 'LAVAMANO', 'LAVAMOPAS', 'FREGADERO', 'URINARIO', 'GRIFERIA', 'LLAVE DE PASO', 'TUBERIA PVC', 'TUBERIA HG', 'DRENAJE']):
            if any(k in desc for k in ['AGUAS BLANCAS', 'AGUA POTABLE']):
                return 'Sanitaria - Agua Potable'
            if any(k in desc for k in ['AGUAS NEGRAS', 'AGUAS RESIDUALES', 'CLOACA']):
                return 'Sanitaria - Drenaje'
            if any(k in desc for k in ['GRIFERIA', 'W.C.', 'LAVAMANO', 'URINARIO', 'FREGADERO']):
                return 'Sanitaria - Accesorios y Grifería'
            return 'Sanitaria - Tuberías'
        
        # A/C
        if any(k in desc for k in ['AIRE ACONDICIONADO', 'A/C', 'EVAPORADORA', 'CONDENSADORA', 'MINI SPLIT', 'DIFUSOR', 'REJILLA', 'DUCTO', 'TERMOSTATO', 'FAN COIL', 'UMA', 'VENTILADOR']):
            if any(k in desc for k in ['EVAPORADORA', 'CONDENSADORA', 'MINI SPLIT', 'UMA', 'FAN COIL']):
                return 'A/C - Equipos'
            if any(k in desc for k in ['DUCTO', 'DIFUSOR', 'REJILLA', 'MANGUERA']):
                return 'A/C - Ductería y Accesorios'
            if any(k in desc for k in ['TUBERIA DE COBRE', 'ARMAFLEX', 'AISLAMIENTO']):
                return 'A/C - Tubería Refrigerante'
            return 'A/C - Accesorios y Controles'
        
        # IMPERMEABILIZACIÓN
        if any(k in desc for k in ['IMPERMEABILIZACION', 'MANTO ASFALTICO', 'SELLADOR', 'MEMBRANA', 'BITUPLAST']):
            return 'Impermeabilización'
        
        # INSTALACIONES ESPECIALES
        if any(k in desc for k in ['ASCENSOR', 'ESCALERA MECANICA', 'CONTRA INCENDIO', 'DETECTOR', 'ALARMA', 'CCTV', 'CAMARA', 'SISTEMA DE SEGURIDAD', 'EXTINTOR']):
            return 'Instalaciones Especiales'
        
        # MOVIMIENTO DE TIERRAS
        if any(k in desc for k in ['EXCAVACION', 'RELLENO', 'NIVELACION', 'COMPACTACION', 'DESMONTE', 'TIERRA', 'GRANZON', 'BASE GRANULAR']):
            return 'Movimiento de Tierras'
        
        # TRANSPORTE Y LIMPIEZA
        if any(k in desc for k in ['TRANSPORTE', 'ACARREO', 'LIMPIEZA', 'BOTE', 'RECOLECCION', 'BASURA']):
            return 'Transporte y Limpieza'
        
        # METALMECÁNICA / ESTRUCTURA METÁLICA
        if any(k in desc for k in ['ESTRUCTURA METALICA', 'PERFIL METALICO', 'PLANCHA', 'SOLDADURA', 'OXICORTE', 'ANCLAJE']):
            return 'Estructura Metálica'
        
        # ALQUILER DE EQUIPOS
        if any(k in desc for k in ['ALQUILER', 'RENTA']):
            return 'Alquiler de Equipos'
        
        return 'Edificaciones - Otros'
    
    # ============================================================
    # REFINAR VIALIDAD
    # ============================================================
    if cat == 'VIALIDAD':
        if any(k in desc for k in ['ASFALTO', 'ASFALTICA', 'BACHEO', 'CARPETA', 'MEZCLA ASFALTICA', 'PRIMER ASFALTICO', 'PAVIMENTO ASFALTICO', 'REPARACION DE PAVIMENTO']):
            return 'Pavimentos Asfálticos'
        if any(k in desc for k in ['PAVIMENTO DE CONCRETO', 'PAVIMENTO RIGIDO', 'CARPETA DE CONCRETO', 'CONCRETO HIDRÁULICO']):
            return 'Pavimentos de Concreto'
        if any(k in desc for k in ['PUENTE', 'VIADUCTO', 'PONTON', 'ELEVADO']):
            if any(k in desc for k in ['CONCRETO', 'VIGA', 'LOSA', 'PILA', 'ESTRIBO']):
                return 'Puentes - Estructura de Concreto'
            if any(k in desc for k in ['ACERO', 'METALICO', 'PERFIL', 'PLANCHA']):
                return 'Puentes - Estructura Metálica'
            return 'Puentes - Otros'
        if any(k in desc for k in ['ALCANTARILLA', 'TUBERIA DE CONCRETO']):
            return 'Drenaje - Alcantarillas de Concreto'
        if any(k in desc for k in ['TUBERIA METALICA', 'GALVANIZADA', 'ARMCO', 'MULTIPLATE', 'CORRUGADA']):
            return 'Drenaje - Alcantarillas Metálicas'
        if any(k in desc for k in ['TUBERIA PVC', 'PVC']):
            return 'Drenaje - Tubería PVC'
        if any(k in desc for k in ['TUBERIA', 'CONDUCTO']):
            return 'Drenaje - Tuberías'
        if any(k in desc for k in ['CUNETA', 'TORRENTERA', 'BAJANTE', 'BATEA', 'SUMIDER', 'BOCA DE VISITA', 'REJILLA']):
            return 'Obras de Drenaje Menor'
        if any(k in desc for k in ['GEOTEXTIL', 'GEOMEMBRANA', 'GEOCOLMENA', 'GAVION', 'MURO DE SOSTENIMIENTO', 'TERRAPLEN', 'SUELO ARMADO']):
            return 'Geotecnia y Contención'
        if any(k in desc for k in ['BASE', 'SUB-BASE', 'GRANZON', 'GRAVA', 'MACADAM', 'SUELO CEMENTO', 'SUELO CAL', 'PIEDRA PICADA', 'MATERIAL GRANULAR']):
            return 'Bases y Sub-bases'
        if any(k in desc for k in ['SEÑAL', 'DEMARCACION', 'DELINEADOR', 'TACHA', 'SEÑALIZACION', 'POSTE']):
            return 'Señalización Vial'
        if any(k in desc for k in ['EXCAVACION', 'RELLENO', 'NIVELACION', 'COMPACTACION', 'DESMONTE', 'LIMPIEZA', 'CONFORMACION']):
            return 'Obras Preparatorias'
        if any(k in desc for k in ['DEFENSA', 'BARRERA', 'SACO CONCRETO', 'SEPARADOR']):
            return 'Defensas y Seguridad Vial'
        if any(k in desc for k in ['ACERA', 'BROCAL', 'ANDEN']):
            return 'Aceras y Brocales'
        if any(k in desc for k in ['CONCRETO', 'RCC']):
            return 'Pavimentos de Concreto'
        return 'Vialidad - Otros'
    
    # ============================================================
    # REFINAR TELECOMUNICACIONES
    # ============================================================
    if cat == 'TELECOMUNICACIONES':
        if any(k in desc for k in ['TORRE', 'MONOPOLO', 'ESTRUCTURA']):
            return 'Torres y Estructuras'
        if any(k in desc for k in ['ANTENA', 'RADIO', 'MW', 'BTS', 'RBS']):
            return 'Equipos de Radio y Antenas'
        if any(k in desc for k in ['FIBRA', 'CABLE', 'COAXIAL']):
            return 'Cableado y Fibra Óptica'
        if any(k in desc for k in ['GABINETE', 'RACK', 'CENTRAL']):
            return 'Equipos de Telecomunicaciones'
        if any(k in desc for k in ['PINTURA', 'GALVANIZADO']):
            return 'Protección y Pintura'
        if any(k in desc for k in ['CIMENTACION', 'ZAPATA', 'CONCRETO']):
            return 'Cimentación y Estructura'
        if any(k in desc for k in ['ALARMA', 'SISTEMA', 'CONTROL']):
            return 'Sistemas de Control'
        if any(k in desc for k in ['TRANSPORTE', 'MONTAJE', 'DESMONTAJE']):
            return 'Montaje y Logística'
        return 'Telecom - Otros'

    # ============================================================
    # REFINAR HIDRAULICA
    # ============================================================
    if cat == 'HIDRAULICA':
        if any(k in desc for k in ['BOMBA', 'MOTOR', 'BOMBEO', 'POZO', 'TABLERO', 'IMPULSION']):
            return 'Equipos de Bombeo'
        if any(k in desc for k in ['VALVULA', 'LLAVE', 'COMPUERTA', 'VENTOSA', 'CHECK', 'REGISTRO']):
            return 'Válvulas y Controles'
        if any(k in desc for k in ['TUBERIA', 'CODO', 'TEE', 'YEE', 'REDUCCION', 'NIPLE', 'JUNTA', 'MANGUERA']):
            return 'Tuberías y Conexiones'
        if any(k in desc for k in ['TANQUE', 'RESERVORIO', 'PISCINA', 'ALJIBE', 'CISTERNA']):
            return 'Tanques y Almacenamiento'
        if any(k in desc for k in ['EXCAVACION', 'ZANJA', 'RELLENO', 'CONCRETO', 'ACUEDUCTO', 'BANCADA']):
            return 'Obras Civiles Hidráulicas'
        return 'Hidráulica - Otros'

    # ============================================================
    # REFINAR URBANISMO
    # ============================================================
    if cat == 'URBANISMO':
        if any(k in desc for k in ['GRAMA', 'ARBOL', 'PLANTA', 'TIERRA NEGRA', 'PODA', 'SIEMBRA', 'PAISAJISMO']):
            return 'Paisajismo y Áreas Verdes'
        if any(k in desc for k in ['POSTE', 'LUMINARIA', 'ALUMBRADO', 'REFLECTOR', 'TAQUILLA', 'TRANSFORMADOR', 'CABLE']):
            return 'Alumbrado Público'
        if any(k in desc for k in ['BANCO', 'PAPELERA', 'PARQUE', 'PARADA', 'SEÑALIZACION', 'MOBILIARIO']):
            return 'Mobiliario Urbano'
        if any(k in desc for k in ['ACERA', 'BROCAL', 'ASFALTO', 'ADOQUIN', 'CONCRETO', 'CAMINERIA', 'PAVIMENTO']):
            return 'Vialidad Urbana y Aceras'
        if any(k in desc for k in ['ACUEDUCTO', 'CLOACA', 'DRENAJE', 'TUBERIA', 'BOCA DE VISITA', 'SUMIDERO']):
            return 'Redes de Servicios'
        return 'Urbanismo - Otros'

    # ============================================================
    # REFINAR REMODELACIONES
    # ============================================================
    if cat == 'REMODELACIONES':
        if any(k in desc for k in ['DEMOLICION', 'REMOCION', 'DESMONTAJE', 'BOTE', 'LIMPIEZA', 'RETIRO']):
            return 'Demoliciones y Remociones'
        if any(k in desc for k in ['DRY WALL', 'TABIQUE', 'BLOQUE', 'PARED', 'YESO']):
            return 'Tabiquería y Cerramientos'
        if any(k in desc for k in ['PINTURA', 'FRISO', 'CERAMICA', 'PORCELANATO', 'PISO', 'ACABADO', 'REVESTIMIENTO']):
            return 'Acabados y Pintura'
        if any(k in desc for k in ['CABLE', 'TUBERIA', 'LUMINARIA', 'TOMACORRIENTE', 'INTERRUPTOR', 'BREAKER', 'SANITARIA']):
            return 'Instalaciones Interiores'
        if any(k in desc for k in ['PUERTA', 'VENTANA', 'CLOSET', 'MADERA', 'METALICA', 'ALUMINIO']):
            return 'Carpintería y Vidrio'
        return 'Remodelaciones - Otros'

    # ============================================================
    # REFINAR PETROLERA
    # ============================================================
    if cat == 'PETROLERA':
        if any(k in desc for k in ['SOLDADURA', 'BRIDA', 'VALVULA', 'TUBERIA DE ACERO', 'ACERO AL CARBONO', 'SPOOL', 'PIPE']):
            return 'Tubería y Soldadura'
        if any(k in desc for k in ['SANDBLASTING', 'PINTURA EPOXICA', 'REVESTIMIENTO', 'AISLAMIENTO', 'PROTECCION', 'CORTAFUEGO']):
            return 'Revestimientos y Protección'
        if any(k in desc for k in ['PERFIL', 'ESTRUCTURA METALICA', 'SOPORTE', 'SKID', 'PLATAFORMA', 'REJILLA']):
            return 'Estructuras Metálicas'
        if any(k in desc for k in ['EXCAVACION', 'RELLENO', 'TERRAPLEN', 'MAQUINARIA PESADA', 'ZANJA', 'MOVIMIENTO']):
            return 'Movimiento de Tierras Pesado'
        if any(k in desc for k in ['INSTRUMENTACION', 'CABLEADO', 'TABLERO', 'MANOMETRO', 'TRANSMISOR', 'CONTROL']):
            return 'Instrumentación y Control'
        return 'Petrolera - Otros'

    # ============================================================
    # GENERAL / SIN CLASIFICAR
    # ============================================================
    if cat == 'GENERAL / SIN CLASIFICAR':
        if any(k in desc for k in ['ALQUILER', 'EQUIPO', 'MAQUIN', 'HERRAMIENTA', 'VEHICULO', 'CAMION']):
            return 'Equipos y Maquinaria'
        if any(k in desc for k in ['AYUDANTE', 'OBRERO', 'MAESTRO', 'INGENIERO', 'TOPOGRAFO', 'MANO DE OBRA']):
            return 'Mano de Obra'
        if any(k in desc for k in ['SUMINISTRO', 'MATERIAL', 'REPUESTO', 'CONSUMIBLE', 'ACERO', 'CONCRETO', 'MADERA']):
            return 'Suministro de Materiales Varios'
        if any(k in desc for k in ['TRANSPORTE', 'FLETE', 'VIAJE', 'BOTE', 'MOVILIZACION']):
            return 'Transporte y Fletes'
        return 'General - Otros'

    return subcat_actual

def main():
    db = SessionLocal()
    
    items = db.query(CostItem).all()
    count_updated = 0
    
    for item in items:
        # Check if it needs a subcategory
        new_subcat = asignar_subcategoria_v2(item.Categoria, item.Descri, item.TipoActividad)
        if new_subcat != item.TipoActividad:
            item.TipoActividad = new_subcat
            count_updated += 1
            
        if count_updated % 1000 == 0 and count_updated > 0:
            db.commit()
            print(f"Updated {count_updated} items...")
            
    db.commit()
    print(f"Update complete! {count_updated} items were sub-categorized by AI rules.")

if __name__ == "__main__":
    main()
