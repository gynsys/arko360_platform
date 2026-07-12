from .grillage_solver import GrillageSolver
from .post_processor import PostProcessor
from .designer import ReinforcementDesigner
from .checks import StructuralChecks
from .renderer import PlanRenderer
from .quantities import QuantitiesComputer

class FoundationSlabDesigner(
    GrillageSolver, 
    PostProcessor, 
    ReinforcementDesigner, 
    StructuralChecks, 
    PlanRenderer, 
    QuantitiesComputer
):
    """
    Diseñador de losa de cimentación por Método de la Grilla.
    Orquestador: combina todos los módulos especializados.
    """
    
    def run_full_analysis(self, extra_uniform_load: float = 0.0) -> dict:
        """Ejecuta el análisis completo: FEM -> post-proceso -> diseño -> verificaciones."""
        self.solve(extra_uniform_load=extra_uniform_load)
        self.compute_moments()
        self.compute_shear()
        self.define_reinforcement_bands()
        self.check_differential_settlements()
        self.check_punching()
        return self._build_results_dict()
    
    def _build_results_dict(self) -> dict:
        """Construye el diccionario de resultados completo para la API."""
        try:
            import numpy as np
        except ImportError:
            pass

        # 1. Preparar datos de bandas
        bandas_list = []
        for bd in self.band_data:
            b_dict = {
                'id': bd['id'],
                'eje': bd['eje'],
                'start_m': bd['start_m'],
                'end_m': bd['end_m'],
                'L_banda_m': bd['L_banda_m'],
                'ancho_m': bd['ancho_m'],
                'As_min_cm2_m': bd['As_min_cm2_m'],
                'As_req_cm2_m': bd['As_req_cm2_m'],
                'acero': bd['acero']
            }
            bandas_list.append(b_dict)

        # 2. Asentamientos
        asentamientos = {
            'max_w_mm': round(np.max(np.abs(self.w)) * 1000, 2) if hasattr(self, 'w') else 0.0,
            'diferenciales': self.settlement_data
        }

        # 3. Punzonamiento
        punzonamiento = self.punching_data

        # 4. Cantidades y Materiales
        cantidades = self._compute_quantities()

        # 5. Generar plano SVG
        svg_plan = self.get_svg_plan()
        
        # 6. Reporte en texto (opcional, útil para debugging o logs)
        self.generate_design_report()

        return {
            'status': 'success',
            'losa': {
                'Lx': self.Lx,
                'Ly': self.Ly,
                'h': self.h,
                'f_c': self.f_c,
                'f_y': self.f_y
            },
            'resultados': {
                'bandas': bandas_list,
                'asentamientos': asentamientos,
                'punzonamiento': punzonamiento,
                'cantidades': cantidades
            },
            'planos': {
                'svg_base64': svg_plan
            }
        }
