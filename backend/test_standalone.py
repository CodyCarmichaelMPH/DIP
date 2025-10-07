from model_worker.v2_simulation import run_v2_simulation

print("✅ Import SUCCESS")
r = run_v2_simulation('COVID')
print(f"Version: {r['version']}")
print(f"Peak: {r['results']['summary']['peak_infection']}")
print(f"Attack Rate: {r['results']['summary']['attack_rate']:.2%}")



