module VideoHttpStubs
  def replace_method(target, name, replacement)
    original = target.method(name)
    target.define_singleton_method(name) { |*args, **options, &block| replacement.call(*args, **options, &block) }
    yield
  ensure
    target.define_singleton_method(name, original)
  end
end
