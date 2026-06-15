import numpy as np
import sys
sys.path.insert(0, '.')
from app.schemas.fea3d import Node, Shell, ShellLoads, Mesh, MeshNode, MeshElement, LoadAssignment, LoadCombination, Material, Section, Topology, Restraint
from app.engine.solvers import StructuralSolver

# Placa 4x4m en z=0, apoyada en las 4 esquinas con apoyo simple (uz fijo)
R_pin = Restraint(ux=False, uy=False, uz=True, rx=False, ry=False, rz=False)
nodes = [
    Node(id='N1', x=0, y=0, z=0, restraint=R_pin),
    Node(id='N2', x=4, y=0, z=0, restraint=R_pin),
    Node(id='N3', x=4, y=4, z=0, restraint=R_pin),
    Node(id='N4', x=0, y=4, z=0, restraint=R_pin),
]
mat = Material(id='M1', E=2e7, G=8e6, nu=0.2, density=2400, name='Concreto')
sec = Section(id='S1', A=0.09, Ix=6.75e-4, Iy=6.75e-4, J=1e-6, name='Col', params={'b': 0.3, 'h': 0.3})

# Malla 4x4 (5x5 nodes)
mesh_nodes, mesh_elements, grid, nc = [], [], {}, 0
for j in range(5):
    for i in range(5):
        nc += 1
        nid = f'G-{nc}'
        grid[(i, j)] = nid
        mesh_nodes.append(MeshNode(id=nid, x=i * 1.0, y=j * 1.0, z=0.0))

for j in range(4):
    for i in range(4):
        ei = j * 4 + i + 1
        mesh_elements.append(MeshElement(
            id=f'E-{ei}', type='quad',
            nodeIds=[grid[(i, j)], grid[(i+1, j)], grid[(i+1, j+1)], grid[(i, j+1)]]
        ))

shell = Shell(
    id='SH1', nodes=['N1', 'N2', 'N3', 'N4'],
    material_id='M1', thickness=0.2,
    loads=ShellLoads(CM=0, CV=0),
    mesh=Mesh(nodes=mesh_nodes, elements=mesh_elements)
)

# Carga puntual 10000 kgf hacia abajo en el centro (2,2)
loads = [LoadAssignment(
    id='L1', type='point_shell', target_id='SH1',
    offset_x=2.0, offset_y=2.0,
    fx=0, fy=0, fz=-10000, mx=0, my=0, mz=0, load_case='CV'
)]

combo = LoadCombination(id='C1', name='1CV', factors={'CM': 0.0, 'CV': 1.0})
topo = Topology(
    nodes=nodes, elements=[], shells=[shell],
    materials=[mat], sections=[sec],
    loads=loads, combinations=[combo]
)

solver = StructuralSolver(topo)
results = solver.solve()
sf = results['results']['C1']['shell_forces']

# j=1,i=1 -> E-6 (near center of the 4x4 mesh, roughly center region)
# j=2,i=2 -> E-11 (exact center element for 4x4 mesh: 3rd col, 3rd row = j*4+i+1=11)
print("=== Shell forces at key elements ===")
for name, eid in [('E-6  (near-center)', 'E-6'), ('E-11 (center)', 'E-11'), ('E-1  (corner)', 'E-1')]:
    v = sf.get(eid, {})
    m11 = v.get('M11', 0)
    m22 = v.get('M22', 0)
    mmax = v.get('M_max', 0)
    print(f"  {name}: M11={m11:.1f}  M22={m22:.1f}  M_max={mmax:.1f}")

disp = results['results']['C1']['displacements']
# G-13 is node at i=2, j=2 (center of 5x5 grid)
ctr_uz = disp.get('G-13', [0]*6)[2]
print(f"\nCenter node G-13 uz = {ctr_uz:.6f} m")

# G-12 is at i=1, j=2 (x=1, y=2) -> should have positive theta_y (ry)
g12 = disp.get('G-12', [0]*6)
print(f"Node G-12 (x=1, y=2): uz={g12[2]:.6f}, rx={g12[3]:.6f}, ry={g12[4]:.6f}")

# G-14 is at i=3, j=2 (x=3, y=2) -> should have negative theta_y (ry)
g14 = disp.get('G-14', [0]*6)
print(f"Node G-14 (x=3, y=2): uz={g14[2]:.6f}, rx={g14[3]:.6f}, ry={g14[4]:.6f}")

print("  Negative uz = plate deflects DOWN (correct for downward load)")
print("  Positive M11/M22 at center = SAGGING moment (correct)")
print("  Negative M11/M22 at center = algorithm still WRONG")
