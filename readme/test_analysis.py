import sys
sys.path.append("/app")

from app.engine.foundation.facade import FoundationSlabDesigner

facade = FoundationSlabDesigner(
    Lx=10, Ly=10, h=0.20,
    E=25e9, nu=0.2, k=30e6, cover=0.05, bar_diam=0.010,
    f_c=21, f_y=420, q_adm=1.5
)
facade.set_mesh(nx=20, ny=20)
facade.add_support_beam(x1=0, y1=1, x2=7, y2=1, width=0.15, depth=0.50, sb_id="VA1")
facade.add_wall(x1=0, y1=1, x2=7, y2=1, thickness=0.12, height=2.7, material_density=1200, wall_type="interno")
facade.add_column(x=1, y=1, width=0.15, length=0.15, height=2.7, load_kgf=1500)

results = facade.run_full_analysis()
print("\n--- TEST ANALYSIS SUCCESSFUL 200 OK ---")
print("Support beam designs:", results.get("support_beam_designs"))
