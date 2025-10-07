#!/usr/bin/env python3
"""Test script for V2 service"""
import sys
sys.path.insert(0, '.')

from model_worker.services.starsim_service_v2 import starsim_service_v2

print("✅ V2 imported successfully")

result = starsim_service_v2.run_simulation("COVID", 928696, 365, 10)
print(f"✅ Simulation ran successfully")
print(f"  Version: {result.get('version', 'MISSING')}")
print(f"  Peak: {result['results']['summary']['peak_infection']}")
print(f"  Attack Rate: {result['results']['summary']['attack_rate']:.2%}")



