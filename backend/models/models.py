from sqlalchemy import JSON, Column, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from models.base import BaseModel


class Tenant(BaseModel):
    __tablename__ = "tenants"

    name = Column(String, nullable=False)
    default_language = Column(String, default="en")

    flows = relationship("Flow", back_populates="tenant", cascade="all, delete-orphan")
    calls = relationship("Call", back_populates="tenant", cascade="all, delete-orphan")
    audio_assets = relationship(
        "AudioAsset", back_populates="tenant", cascade="all, delete-orphan"
    )


class Flow(BaseModel):
    __tablename__ = "flows"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    trigger = Column(String)
    trigger_value = Column(String)
    definition = Column(JSON, nullable=False, default=dict)
    status = Column(String, default="draft")

    tenant = relationship("Tenant", back_populates="flows")
    calls = relationship("Call", back_populates="flow")
    audio_assets = relationship("AudioAsset", back_populates="flow")


class Call(BaseModel):
    __tablename__ = "calls"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    flow_id = Column(UUID(as_uuid=True), ForeignKey("flows.id"), nullable=True)
    call_id = Column(String, nullable=False, unique=True, index=True)
    from_number = Column(String)
    to_number = Column(String)
    status = Column(String, default="initiated")
    session_data = Column(JSON, default=dict)
    duration_seconds = Column(Integer, default=0)

    tenant = relationship("Tenant", back_populates="calls")
    flow = relationship("Flow", back_populates="calls")


class AudioAsset(BaseModel):
    __tablename__ = "audio_assets"

    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    flow_id = Column(UUID(as_uuid=True), ForeignKey("flows.id"), nullable=True)
    step_id = Column(String, nullable=True)

    type = Column(String, nullable=False)
    language = Column(String, nullable=False)
    file_path = Column(String, nullable=False)

    tenant = relationship("Tenant", back_populates="audio_assets")
    flow = relationship("Flow", back_populates="audio_assets")
