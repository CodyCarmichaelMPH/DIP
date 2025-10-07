# Module: model_worker.services.artifact_generator
# Purpose: Generate artifacts (JSON, CSV, PDF) from simulation results
# Inputs: Run ID, run config, results, data snapshot
# Outputs: Paths to generated artifacts
# Errors: File generation errors, storage errors
# Tests: test_artifact_generator.py

"""
PSEUDOCODE
1) Initialize generator with storage adapter
2) Define methods for:
   a. Generating JSON summary
   b. Generating CSV exports
   c. Generating PDF brief
   d. Coordinating artifact generation
3) For each artifact type:
   a. Format data appropriately
   b. Generate file content
   c. Store artifact
   d. Return path
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors

logger = logging.getLogger(__name__)

class ArtifactGenerator:
    """Generator for simulation artifacts"""
    
    def __init__(self, storage_adapter):
        """Initialize with storage adapter"""
        self.storage_adapter = storage_adapter
    
    def generate_artifacts(self, run_id: str, run_config: Dict[str, Any], results: Dict[str, Any], data_snapshot: Dict[str, Any]) -> Dict[str, str]:
        """Generate all artifacts for a run"""
        artifacts = {}
        
        # Generate JSON summary
        json_path = self._generate_json_summary(run_id, run_config, results, data_snapshot)
        artifacts["json_summary"] = json_path
        
        # Generate CSV exports
        csv_paths = self._generate_csv_exports(run_id, run_config, results, data_snapshot)
        artifacts.update(csv_paths)
        
        # Generate PDF brief
        pdf_path = self._generate_pdf_brief(run_id, run_config, results, data_snapshot)
        artifacts["pdf_brief"] = pdf_path
        
        logger.info(f"Generated {len(artifacts)} artifacts for run {run_id}")
        return artifacts
    
    def _generate_json_summary(self, run_id: str, run_config: Dict[str, Any], results: Dict[str, Any], data_snapshot: Dict[str, Any]) -> str:
        """Generate JSON summary of results"""
        # Create summary structure
        summary = {
            "run_id": run_id,
            "config": run_config,
            "results": results,
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "jurisdiction": run_config.get("jurisdiction_id"),
                "disease": run_config.get("disease"),
                "run_name": run_config.get("run_name"),
                "created_by": run_config.get("created_by")
            },
            "data_snapshot": {
                "tract_count": len(data_snapshot.get("tracts", [])),
                "facility_count": len(data_snapshot.get("facilities", [])),
                "timeseries_points": len(data_snapshot.get("timeseries", []))
            }
        }
        
        # Convert to JSON
        json_content = json.dumps(summary, indent=2, default=str)
        
        # Store artifact
        artifact_path = self.storage_adapter.store_artifact(
            run_id, "json", json_content.encode("utf-8")
        )
        
        logger.info(f"Generated JSON summary at {artifact_path}")
        return artifact_path
    
    def _generate_csv_exports(self, run_id: str, run_config: Dict[str, Any], results: Dict[str, Any], data_snapshot: Dict[str, Any]) -> Dict[str, str]:
        """Generate CSV exports of results"""
        csv_paths = {}
        
        # Export timeseries data
        timeseries_path = self._export_timeseries_csv(run_id, results)
        csv_paths["timeseries"] = timeseries_path
        
        # Export facility impacts
        facility_path = self._export_facility_impacts_csv(run_id, results)
        csv_paths["facility_impacts"] = facility_path
        
        # Export tract-level results
        tract_path = self._export_tract_results_csv(run_id, results, data_snapshot)
        csv_paths["tract_results"] = tract_path
        
        return csv_paths
    
    def _export_timeseries_csv(self, run_id: str, results: Dict[str, Any]) -> str:
        """Export timeseries data to CSV"""
        # Create DataFrame from results
        rows = []
        
        for metric, timeseries in results.get("timeseries", {}).items():
            for point in timeseries:
                rows.append({
                    "metric": metric,
                    "date": point["date"],
                    "value": point["value"]
                })
        
        df = pd.DataFrame(rows)
        
        # Convert to CSV
        csv_content = df.to_csv(index=False)
        
        # Store artifact
        artifact_path = self.storage_adapter.store_artifact(
            run_id, "csv", csv_content.encode("utf-8")
        )
        
        logger.info(f"Generated timeseries CSV at {artifact_path}")
        return artifact_path
    
    def _export_facility_impacts_csv(self, run_id: str, results: Dict[str, Any]) -> str:
        """Export facility impacts to CSV"""
        # Create DataFrame from results
        rows = []
        
        for impact in results.get("facility_impacts", []):
            rows.append({
                "facility_id": impact["facility_id"],
                "type": impact["type"],
                "risk_band": impact["risk_band"],
                "expected_cases": impact["expected_cases"],
                "case_range_low": impact["case_range"]["low"],
                "case_range_high": impact["case_range"]["high"],
                "capacity_impact_pct": impact["capacity_impact_pct"]
            })
        
        df = pd.DataFrame(rows)
        
        # Convert to CSV
        csv_content = df.to_csv(index=False)
        
        # Store artifact
        artifact_path = self.storage_adapter.store_artifact(
            run_id, "csv", csv_content.encode("utf-8")
        )
        
        logger.info(f"Generated facility impacts CSV at {artifact_path}")
        return artifact_path
    
    def _export_tract_results_csv(self, run_id: str, results: Dict[str, Any], data_snapshot: Dict[str, Any]) -> str:
        """Export tract-level results to CSV"""
        # Create DataFrame from results
        rows = []
        
        # Get tract data
        tracts = data_snapshot.get("tracts", [])
        
        for tract in tracts:
            tract_fips = tract["properties"]["GEOID20"]
            
            # Get demographics for this tract
            demographics = next(
                (d for d in data_snapshot.get("demographics", []) if d["tract_fips"] == tract_fips),
                {}
            )
            
            # Get facilities in this tract
            facilities = [
                f for f in data_snapshot.get("facilities", [])
                if f.get("tract_fips") == tract_fips
            ]
            
            # Calculate summary metrics
            total_cases = sum(
                point["value"] for metric, timeseries in results.get("timeseries", {}).items()
                for point in timeseries
            )
            
            rows.append({
                "tract_fips": tract_fips,
                "total_cases": total_cases,
                "facility_count": len(facilities),
                "population": sum(demographics.get("age_distribution", {}).values()),
                "svi_percentile": demographics.get("svi_percentile", 0.5),
                "nri_score": demographics.get("nri_score", 0.5)
            })
        
        df = pd.DataFrame(rows)
        
        # Convert to CSV
        csv_content = df.to_csv(index=False)
        
        # Store artifact
        artifact_path = self.storage_adapter.store_artifact(
            run_id, "csv", csv_content.encode("utf-8")
        )
        
        logger.info(f"Generated tract results CSV at {artifact_path}")
        return artifact_path
    
    def _generate_pdf_brief(self, run_id: str, run_config: Dict[str, Any], results: Dict[str, Any], data_snapshot: Dict[str, Any]) -> str:
        """Generate PDF brief of results"""
        # Create PDF document
        pdf_content = self._create_pdf_content(run_id, run_config, results, data_snapshot)
        
        # Store artifact
        artifact_path = self.storage_adapter.store_artifact(
            run_id, "pdf", pdf_content
        )
        
        logger.info(f"Generated PDF brief at {artifact_path}")
        return artifact_path
    
    def _create_pdf_content(self, run_id: str, run_config: Dict[str, Any], results: Dict[str, Any], data_snapshot: Dict[str, Any]) -> bytes:
        """Create PDF content"""
        from io import BytesIO
        
        # Create in-memory PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Build content
        story = []
        
        # Title
        story.append(Paragraph("Disease Impact Projection Brief", title_style))
        story.append(Spacer(1, 12))
        
        # Run information
        story.append(Paragraph(f"Run ID: {run_id}", styles["Normal"]))
        story.append(Paragraph(f"Disease: {run_config.get('disease')}", styles["Normal"]))
        story.append(Paragraph(f"Jurisdiction: {run_config.get('jurisdiction_id')}", styles["Normal"]))
        story.append(Paragraph(f"Run Name: {run_config.get('run_name')}", styles["Normal"]))
        story.append(Paragraph(f"Created By: {run_config.get('created_by')}", styles["Normal"]))
        story.append(Spacer(1, 12))
        
        # Key findings
        story.append(Paragraph("Key Findings", styles["Heading2"]))
        
        # Get summary metrics
        total_cases = sum(
            point["value"] for metric, timeseries in results.get("timeseries", {}).items()
            for point in timeseries
        )
        
        high_risk_facilities = [
            f for f in results.get("facility_impacts", [])
            if f["risk_band"] == "high"
        ]
        
        story.append(Paragraph(f"Total Expected Cases: {total_cases:.0f}", styles["Normal"]))
        story.append(Paragraph(f"High-Risk Facilities: {len(high_risk_facilities)}", styles["Normal"]))
        story.append(Spacer(1, 12))
        
        # Facility impacts table
        if results.get("facility_impacts"):
            story.append(Paragraph("Facility Impacts", styles["Heading2"]))
            
            # Create table data
            table_data = [["Facility ID", "Type", "Risk Band", "Expected Cases", "Capacity Impact %"]]
            
            for impact in results["facility_impacts"][:10]:  # Limit to top 10
                table_data.append([
                    impact["facility_id"],
                    impact["type"],
                    impact["risk_band"],
                    f"{impact['expected_cases']:.1f}",
                    f"{impact['capacity_impact_pct']:.1f}%"
                ])
            
            # Create table
            table = Table(table_data)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 14),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                ("GRID", (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(table)
            story.append(Spacer(1, 12))
        
        # Assumptions and uncertainty
        story.append(Paragraph("Assumptions and Uncertainty", styles["Heading2"]))
        story.append(Paragraph("This simulation is based on current data and model parameters. Results represent conditional scenarios, not forecasts.", styles["Normal"]))
        story.append(Paragraph("Key assumptions:", styles["Normal"]))
        story.append(Paragraph("• Disease transmission follows SEIR dynamics", styles["Normal"]))
        story.append(Paragraph("• Contact patterns are based on facility types and demographics", styles["Normal"]))
        story.append(Paragraph("• No major changes in behavior or interventions", styles["Normal"]))
        story.append(Spacer(1, 12))
        
        # Footer
        story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles["Normal"]))
        story.append(Paragraph("This is a conditional simulation for planning purposes only.", styles["Normal"]))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()
        
        return pdf_content







